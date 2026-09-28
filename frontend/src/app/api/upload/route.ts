import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedPreset = (formData.get('upload_preset') as string) || 'ml_default';
    const cloudName = (formData.get('cloud_name') as string) || 'drxliiejo';
    const apiKey = formData.get('api_key') as string | null;
    const apiSecret = formData.get('api_secret') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Option 1: If API Key & Secret provided, perform Signed Cloudinary Upload
    if (apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const stringToSign = `timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      const signedFormData = new FormData();
      const blob = new Blob([buffer], { type: file.type || 'application/pdf' });
      signedFormData.append('file', blob, file.name);
      signedFormData.append('api_key', apiKey);
      signedFormData.append('timestamp', timestamp);
      signedFormData.append('signature', signature);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const res = await fetch(uploadUrl, { method: 'POST', body: signedFormData });
      const data = await res.json();

      if (res.ok && data.secure_url) {
        return NextResponse.json({
          url: data.secure_url,
          public_id: data.public_id,
          original_filename: file.name,
          source: 'cloudinary_signed',
        });
      }
    }

    // Option 2: Try Unsigned Cloudinary Upload with fallback preset list
    const presetsToTry = Array.from(new Set([requestedPreset, 'ml_default', 'unsigned', 'pdf_preset', 'preset1', 'upload', 'default']));

    for (const preset of presetsToTry) {
      const cloudinaryFormData = new FormData();
      const blob = new Blob([buffer], { type: file.type || 'application/pdf' });
      cloudinaryFormData.append('file', blob, file.name);
      cloudinaryFormData.append('upload_preset', preset);

      // Try auto/upload then raw/upload
      const endpoints = [
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      ];

      for (const uploadUrl of endpoints) {
        try {
          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: cloudinaryFormData,
          });
          const data = await response.json();

          if (response.ok && (data.secure_url || data.url)) {
            return NextResponse.json({
              url: data.secure_url || data.url,
              public_id: data.public_id,
              original_filename: file.name,
              preset_used: preset,
              source: 'cloudinary_unsigned',
            });
          }
        } catch (e) {
          // continue to next endpoint
        }
      }
    }

    // Option 3: Fallback Local Storage URL if Cloudinary preset is not configured on drxliiejo
    // Save file to Next.js public/uploads folder so Flask backend can still download and process it seamlessly!
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const origin = req.headers.get('origin') || req.headers.get('host') || 'http://localhost:3000';
    const localUrl = origin.startsWith('http') ? `${origin}/uploads/${safeFileName}` : `http://${origin}/uploads/${safeFileName}`;

    return NextResponse.json({
      url: localUrl,
      original_filename: file.name,
      source: 'local_fallback',
      warning: `Cloudinary account '${cloudName}' requires an unsigned upload preset. Saved file locally and generated accessible URL for Flask RAG.`,
    });
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
