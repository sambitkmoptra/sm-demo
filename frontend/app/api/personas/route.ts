import { Firestore } from '@google-cloud/firestore';
import { NextResponse } from 'next/server';

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'moptra-ai-demo',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandName = searchParams.get('brand_name') || 'Acme Sports';

    console.log(`[Next.js API] Fetching personas for brand: ${brandName}`);

    const snapshot = await firestore
      .collection('personas')
      .where('brand_name', '==', brandName)
      .get();

    const personas: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore Timestamp to ISO string or fallback to string representation
      if (data.created_at && typeof data.created_at.toDate === 'function') {
        data.created_at = data.created_at.toDate().toISOString();
      } else if (data.created_at && typeof data.created_at.toISOString === 'function') {
        data.created_at = data.created_at.toISOString();
      } else if (data.created_at) {
        data.created_at = String(data.created_at);
      }
      personas.push(data);
    });

    // In-memory sort by created_at descending to prevent Firebase index requirements
    personas.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ personas });
  } catch (error: any) {
    console.error('[Next.js API] Error fetching personas:', error);
    return NextResponse.json({
      error: error.message || 'Internal Server Error fetching personas.'
    }, { status: 500 });
  }
}
