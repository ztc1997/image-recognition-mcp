import fs from "fs";
import sharp from "sharp";

// Max data URL size: 1MB. LM Studio and similar local servers
// often fail to decode images beyond this threshold.
const MAX_DATA_URL_BYTES = 1 * 1024 * 1024;

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Resize image buffer to fit within MAX_DATA_URL_BYTES as a base64 data URL.
 * Progressively reduces dimensions and JPEG quality until the size fits.
 */
async function resizeToFit(fileBuffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const estimatedDataUrlSize = fileBuffer.length * 1.37 + 30;
  if (estimatedDataUrlSize <= MAX_DATA_URL_BYTES) {
    return { buffer: fileBuffer, mimeType };
  }

  const image = sharp(fileBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 2048;

  const scaleSteps = [0.75, 0.5, 0.375, 0.25];
  for (const scale of scaleSteps) {
    const targetWidth = Math.round(width * scale);
    const qualities = [85, 70, 55, 40];

    for (const quality of qualities) {
      const buf = await image
        .resize(targetWidth)
        .jpeg({ quality })
        .toBuffer();
      const estimatedSize = buf.length * 1.37 + 30;
      if (estimatedSize <= MAX_DATA_URL_BYTES) {
        return { buffer: buf, mimeType: 'image/jpeg' };
      }
    }
  }

  // Last resort: 512px wide, quality 30
  const buf = await image.resize(512).jpeg({ quality: 30 }).toBuffer();
  return { buffer: buf, mimeType: 'image/jpeg' };
}

/**
 * Read image file and convert to base64 data URL.
 * Automatically resizes large images to stay within size limits.
 */
export async function convertImageToDataUrl(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const metadata = await sharp(fileBuffer).metadata();
  const mimeType = SHARP_FORMAT_TO_MIME[metadata.format || ''] || 'image/jpeg';
  const result = await resizeToFit(fileBuffer, mimeType);
  const base64Data = result.buffer.toString('base64');
  return `data:${result.mimeType};base64,${base64Data}`;
}

/**
 * Create image content object for local file
 */
export async function createLocalImageContent(filePath: string): Promise<{ type: "image_url"; image_url: { url: string } }> {
  const dataUrl = await convertImageToDataUrl(filePath);
  return {
    type: "image_url",
    image_url: { url: dataUrl }
  };
}

/**
 * Create image content object for URL
 */
export function createUrlImageContent(imageUrl: string): { type: "image_url"; image_url: { url: string } } {
  return {
    type: "image_url",
    image_url: { url: imageUrl }
  };
}
