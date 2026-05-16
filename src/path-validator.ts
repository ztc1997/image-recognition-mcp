import path from "path";
import fs from "fs";

// Allowed image file extensions
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Check if the given path is a local file path
 */
export function isPathLocal(imagePath: string): boolean {
  // Unix-style paths
  if (imagePath.startsWith('/') || imagePath.startsWith('./') || imagePath.startsWith('../')) {
    return true;
  }
  // Windows absolute paths with drive letter (e.g., C:\ or C:/)
  if (/^[a-zA-Z]:[/\\]/.test(imagePath)) {
    return true;
  }
  // Windows UNC paths (e.g., \\server\share)
  if (imagePath.startsWith('\\\\')) {
    return true;
  }
  // Windows relative paths with backslash (e.g., .\images\photo.png)
  if (imagePath.startsWith('.\\') || imagePath.startsWith('..\\')) {
    return true;
  }
  return false;
}

/**
 * Validate file extension
 */
export function validateExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error(`Invalid file type: ${ext}. Allowed extensions: ${allowedExtensions.join(', ')}`);
  }
}

/**
 * Check if the file path is within allowed directories
 */
export function isPathAllowed(absolutePath: string, allowedPaths: string[]): boolean {
  return allowedPaths.some(allowedPath =>
    absolutePath.startsWith(path.resolve(allowedPath))
  );
}

/**
 * Validate that the file exists
 */
export function validateFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * Validate local file path with all security checks
 */
export function validateLocalPath(
  imageUrl: string,
  allowedPaths: string[],
  allowAllPaths: boolean
): string {
  const absolutePath = path.resolve(imageUrl);

  // Check file extension first
  validateExtension(absolutePath);

  // Validate that the file path is within allowed directories (unless all paths are allowed)
  if (!allowAllPaths) {
    if (!isPathAllowed(absolutePath, allowedPaths)) {
      throw new Error(`File path not allowed: ${imageUrl}. Allowed paths: ${allowedPaths.join(', ')}`);
    }
  }

  // Check if file exists
  validateFileExists(absolutePath);

  return absolutePath;
}

/**
 * Validate URL domain (optional security feature)
 */
export function validateUrlDomain(url: string, allowedDomains: string[] | null): void {
  if (allowedDomains) {
    const parsedUrl = new URL(url);
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      throw new Error(`URL domain not allowed: ${parsedUrl.hostname}. Allowed domains: ${allowedDomains.join(', ')}`);
    }
  }
}
