import { GoogleGenAI } from '@google/genai';
import { Storage } from '@google-cloud/storage';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { NextResponse } from 'next/server';

// Initialize GCP Clients
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT || 'moptra-ai-demo',
  location: 'global',
});

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'moptra-ai-demo',
});

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'moptra-ai-demo',
});

export async function POST(request: Request) {
  try {
    const {
      prompt,
      gender,
      hair_color,
      eye_color,
      ethnicity,
      age,
      clothing_style,
      brand_name = 'Acme Sports'
    } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Style brief/prompt is required' }, { status: 400 });
    }

    const personaId = `persona-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`[Next.js API] Starting Persona Synthesis: ${personaId} for brand: ${brand_name}`);

    // Step 1: Generate Persona Name & Description using gemini-2.5-flash
    let modelName = 'Model';
    let modelDescription = '';

    try {
      console.log(`[Next.js API] Invoking gemini-2.5-flash for name & description...`);
      const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert creative director. Create a name and a detailed, high-fidelity personality description for a brand model persona.
The persona has the following parameters:
- Base style brief: ${prompt}
- Gender: ${gender || 'any'}
- Ethnicity: ${ethnicity || 'any'}
- Hair color: ${hair_color || 'any'}
- Eye color: ${eye_color || 'any'}
- Age group: ${age || 'any'}
- Clothing style: ${clothing_style || 'any'}

Provide a realistic model name (first name only) and a rich, professional, 2-3 sentence description detailing their vibe, brand alignment, and demographic appeal.
Return your response as a valid JSON object with keys "name" and "description". Do not wrap in markdown code blocks.`,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = textResponse.text?.trim() || '';
      console.log(`[Next.js API] Text model response:`, responseText);
      
      const parsedText = JSON.parse(responseText);
      modelName = parsedText.name || 'Model';
      modelDescription = parsedText.description || '';
    } catch (textErr) {
      console.error('[Next.js API] Failed to generate text personality profile:', textErr);
      // Fallback
      modelName = gender === 'Male' ? 'Alex' : gender === 'Female' ? 'Sophia' : 'Sam';
      modelDescription = `A professional model styled for the ${brand_name} campaign, displaying a clean, modern aesthetic suitable for lifestyle audiences.`;
    }

    // Step 2: Generate 3 realistic persona images sequentially
    // Image Prompts (Portrait, Medium Torso, Full Body)
    const visualDescriptors = [
      gender ? `${gender}` : 'person',
      ethnicity ? `${ethnicity} ethnicity` : '',
      age ? `aged ${age}` : '',
      hair_color ? `with ${hair_color} hair` : '',
      eye_color ? `with ${eye_color} eyes` : '',
      clothing_style ? `wearing ${clothing_style}` : 'wearing modern athletic attire',
      prompt ? `${prompt}` : ''
    ].filter(Boolean).join(', ');

    const commonStyle = `Professional studio lighting, high-end commercial fashion photoshoot, realistic skin textures, sharp focus, neutral background, photorealistic, shot on 85mm lens.`;

    const imagePrompts = [
      `Close-up studio headshot portrait photography of a model named ${modelName}, focusing on face, head and shoulders, looking directly at the camera. Details: ${visualDescriptors}. ${commonStyle}`,
      `Medium studio shot photography of a model named ${modelName}, showing torso and arms, natural relaxed posture. Details: ${visualDescriptors}. ${commonStyle}`,
      `Full-body photography of a model named ${modelName} standing, showing complete clothing and footwear, natural pose. Details: ${visualDescriptors}. ${commonStyle}`
    ];

    const publicUrls: string[] = [];
    const bucketName = process.env.GCS_BUCKET_NAME || 'social-media-agent-media';
    const bucket = storage.bucket(bucketName);

    console.log(`[Next.js API] Generating 3 images with gemini-3.1-flash-image...`);

    for (let i = 0; i < 3; i++) {
      console.log(`[Next.js API] Generating shot ${i + 1}/3 (Prompt length: ${imagePrompts[i].length})`);
      
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: [imagePrompts[i]]
      });

      const candidate = imgResponse.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      let imgBase64 = '';

      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          imgBase64 = part.inlineData.data || '';
          break;
        }
      }

      if (!imgBase64) {
        throw new Error(`Failed to generate image for angle ${i + 1}. No image part returned by Vertex AI.`);
      }

      // Save image to GCS
      const fullFilePath = `personas/${personaId}/angle_${i}.jpg`;
      const file = bucket.file(fullFilePath);
      const buffer = Buffer.from(imgBase64, 'base64');

      console.log(`[Next.js API] Saving image to GCS: gs://${bucketName}/${fullFilePath}`);
      await file.save(buffer, {
        contentType: 'image/jpeg',
        metadata: {
          cacheControl: 'public, max-age=31536000',
        }
      });

      try {
        await file.makePublic();
      } catch (_) {
        // Ignore makePublic ACL failures since bucket policies allow read
      }

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fullFilePath}`;
      publicUrls.push(publicUrl);
    }

    // Step 3: Write Persona Document to Firestore
    console.log(`[Next.js API] Syncing Persona document to Firestore: personas/${personaId}`);
    const personaDoc = {
      persona_id: personaId,
      brand_name: brand_name,
      name: modelName,
      prompt: prompt,
      gender: gender || '',
      hair_color: hair_color || '',
      eye_color: eye_color || '',
      ethnicity: ethnicity || '',
      age: age || '',
      clothing_style: clothing_style || '',
      description: modelDescription,
      images: publicUrls,
      created_at: FieldValue.serverTimestamp()
    };

    await firestore.collection('personas').doc(personaId).set(personaDoc);
    console.log(`[Next.js API] Persona synthesis completed successfully.`);

    return NextResponse.json({
      success: true,
      persona: {
        ...personaDoc,
        created_at: new Date().toISOString() // Return ISO string for frontend client parsing
      }
    });

  } catch (error: any) {
    console.error('[Next.js API] Persona Synthesis Error:', error);
    return NextResponse.json({
      error: error.message || 'Internal Server Error during persona generation.'
    }, { status: 500 });
  }
}
