import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';
import { NextResponse } from 'next/server';

// Initialize clients
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || 'moptra-ai-demo',
  location: 'global', // gemini-3.1-flash-image is only available in the 'global' location on Vertex AI
});

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'moptra-ai-demo',
});

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'moptra-ai-demo',
});

interface Base64ParseResult {
  mimeType: string;
  data: string;
}

function parseBase64Image(dataString: string): Base64ParseResult | null {
  if (!dataString) return null;
  const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  // Fallback if raw base64 is passed
  return {
    mimeType: 'image/jpeg',
    data: dataString
  };
}

export async function POST(request: Request) {
  try {
    const { 
      prompt, 
      product_image, 
      persona_images = [], 
      aspect_ratio = '1:1',
      campaign_id,
      post_type,
      slide_index
    } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const contentParts: any[] = [];
    
    // Construct system instructions
    let instructionText = `You are a professional ad graphic designer. Generate a high-fidelity, high-resolution marketing image in the requested aspect ratio: ${aspect_ratio}.`;
    
    if (product_image) {
      instructionText += ` You MUST use the exact product shown in the Product Image (Image 1) and place it realistically in the scene. Maintain the product's shapes, logos, colors, and design precisely.`;
    }
    
    if (persona_images && persona_images.length > 0) {
      instructionText += ` Incorporate the influencer/persona from the Persona Image(s) naturally into the scene, showing them interacting with the product.`;
    }
    
    instructionText += ` Scene layout details and brand guidelines: ${prompt}`;
    
    contentParts.push({ text: instructionText });

    // Append Product Image
    if (product_image) {
      const parsedProduct = parseBase64Image(product_image);
      if (parsedProduct) {
        contentParts.push({
          inlineData: {
            mimeType: parsedProduct.mimeType,
            data: parsedProduct.data
          }
        });
      }
    }

    // Append Persona Images
    if (persona_images && persona_images.length > 0) {
      for (const imgStr of (persona_images as string[])) {
        const parsedPersona = parseBase64Image(imgStr);
        if (parsedPersona) {
          contentParts.push({
            inlineData: {
              mimeType: parsedPersona.mimeType,
              data: parsedPersona.data
            }
          });
        }
      }
    }

    console.log(`[Next.js API] Calling gemini-3.1-flash-image in location: global. Project: ${process.env.GOOGLE_CLOUD_PROJECT}, Prompt length: ${instructionText.length}`);

    // Call Gemini 3.1 Flash Image model
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: contentParts
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let generatedImageB64 = '';

    for (const part of parts) {
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        generatedImageB64 = part.inlineData.data || '';
        break;
      }
    }

    if (!generatedImageB64) {
      console.error('[Next.js API] No image part found in the Gemini response candidates:', JSON.stringify(parts));
      return NextResponse.json({ 
        error: 'No image was returned by the generative model. Check your project permissions or safety filters.' 
      }, { status: 502 });
    }

    console.log('[Next.js API] Image generated successfully. Size:', generatedImageB64.length);

    let publicUrl = '';

    // If campaign details are provided, persist the creative in Cloud Storage & Firestore
    if (campaign_id && post_type) {
      try {
        const bucketName = process.env.GCS_BUCKET_NAME || 'social-media-agent-media';
        const folderName = `campaigns/${campaign_id}`;
        const fileName = `${post_type}${slide_index !== undefined ? `_slide_${slide_index}` : ''}.jpg`;
        const fullFilePath = `${folderName}/${fileName}`;

        console.log(`[Next.js API] Uploading generated creative to GCS: gs://${bucketName}/${fullFilePath}`);

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fullFilePath);
        const buffer = Buffer.from(generatedImageB64, 'base64');

        // Save image buffer to storage
        await file.save(buffer, {
          contentType: 'image/jpeg',
          metadata: {
            cacheControl: 'public, max-age=31536000',
          }
        });

        // Set permission to public read (if bucket settings allow)
        try {
          await file.makePublic();
        } catch (aclError) {
          console.warn('[Next.js API] Could not make GCS file public. Bucket might have Uniform Bucket-Level Access active.', aclError);
        }

        publicUrl = `https://storage.googleapis.com/${bucketName}/${fullFilePath}`;
        console.log('[Next.js API] Uploaded to GCS. URL:', publicUrl);

        // Update campaign document state in Firestore (Admin mode bypasses read/write permission rules)
        console.log(`[Next.js API] Syncing GCS URL to campaign doc: campaigns/${campaign_id}`);
        const docRef = firestore.collection('campaigns').doc(campaign_id);
        const updateField = slide_index !== undefined 
          ? `media_outputs.instagram.${slide_index}` 
          : `media_outputs.${post_type}`;

        await docRef.update({
          [updateField]: publicUrl
        });
        
        console.log('[Next.js API] Firestore state sync successful.');

      } catch (dbError) {
        console.error('[Next.js API] Failed GCS upload or Firestore sync:', dbError);
        // Do not fail the request if database syncing failed but image was generated successfully
      }
    }

    return NextResponse.json({ 
      generated_image_b64: generatedImageB64,
      public_url: publicUrl 
    });

  } catch (error: any) {
    console.error('[Next.js API] Error generating image:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
