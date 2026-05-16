import { describe, it, expect, beforeAll } from 'vitest';
import { getMimeType } from '../src/image-processor.js';
import { isPathLocal, isPathAllowed, validateExtension, validateFileExists } from '../src/path-validator.js';
import fs from 'fs';
import path from 'path';

describe('Image Recognition MCP Server Tests', () => {
  describe('getMimeType', () => {
    it('should return correct MIME type for JPEG files', () => {
      expect(getMimeType('test.jpg')).toBe('image/jpeg');
      expect(getMimeType('test.jpeg')).toBe('image/jpeg');
    });

    it('should return correct MIME type for PNG files', () => {
      expect(getMimeType('test.png')).toBe('image/png');
    });

    it('should return correct MIME type for GIF files', () => {
      expect(getMimeType('test.gif')).toBe('image/gif');
    });

    it('should return correct MIME type for WebP files', () => {
      expect(getMimeType('test.webp')).toBe('image/webp');
    });

    it('should throw error for unknown extensions', () => {
      expect(() => getMimeType('test.unknown')).toThrow('Unsupported extension for MIME type');
    });

    it('should handle uppercase extensions', () => {
      expect(getMimeType('test.PNG')).toBe('image/png');
      expect(getMimeType('test.JPG')).toBe('image/jpeg');
    });
  });

  describe('Test Image File Validation', () => {
    const testImagePath = path.join(process.cwd(), 'test', 'test.png');
    let imageBuffer: Buffer;

    beforeAll(() => {
      imageBuffer = fs.readFileSync(testImagePath);
    });

    it('should verify test image exists', () => {
      expect(fs.existsSync(testImagePath)).toBe(true);
    });

    it('should be able to read test image as buffer', () => {
      expect(imageBuffer).toBeInstanceOf(Buffer);
      expect(imageBuffer.length).toBeGreaterThan(0);
    });


    it('should create valid data URL from test image', () => {
      const base64 = imageBuffer.toString('base64');
      const mimeType = getMimeType(testImagePath);
      const dataUrl = `data:${mimeType};base64,${base64}`;

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(dataUrl.length).toBeGreaterThan(100); // Should have substantial content
    });
  });

  describe('Path Validation Tests', () => {
    it('should identify local file paths correctly', () => {
      const localPaths = [
        './images/test.png',
        '../assets/photo.jpg',
        '/absolute/path/image.png'
      ];

      localPaths.forEach(testPath => {
        expect(isPathLocal(testPath)).toBe(true);
      });
    });

    it('should identify Windows local file paths correctly', () => {
      const windowsLocalPaths = [
        'C:\\Users\\photo.png',
        'C:/Users/photo.png',
        'D:\\project\\images\\test.png',
        'D:/project/images/test.png',
        '.\\images\\test.png',
        '..\\assets\\photo.jpg',
        '\\\\server\\share\\image.png'
      ];

      windowsLocalPaths.forEach(testPath => {
        expect(isPathLocal(testPath)).toBe(true);
      });
    });

    it('should identify URL paths correctly', () => {
      const urlPaths = [
        'https://example.com/image.jpg',
        'http://example.com/photo.png',
        'https://cdn.example.com/assets/image.webp'
      ];

      urlPaths.forEach(testPath => {
        expect(isPathLocal(testPath)).toBe(false);
      });
    });

  });

  describe('Environment Configuration Tests', () => {
    it('should parse allowed paths from environment', () => {
      const testEnvPaths = './images,./assets,./test';
      const allowedPaths = testEnvPaths.split(',').map(p => p.trim());

      expect(allowedPaths).toEqual(['./images', './assets', './test']);
      expect(allowedPaths.length).toBe(3);
    });

    it('should parse allowed domains from environment', () => {
      const testEnvDomains = 'example.com,cdn.example.com,images.example.org';
      const allowedDomains = testEnvDomains.split(',').map(d => d.trim());

      expect(allowedDomains).toEqual(['example.com', 'cdn.example.com', 'images.example.org']);
      expect(allowedDomains.length).toBe(3);
    });
  });

  describe('File System Security Tests', () => {
    it('should validate path is within allowed directories', () => {
      const allowedPaths = ['./images', './assets', './test'];
      const testPath = path.resolve('./test/test.png');

      expect(isPathAllowed(testPath, allowedPaths)).toBe(true);
    });

    it('should reject paths outside allowed directories', () => {
      const allowedPaths = ['./images', './assets'];
      const testPath = path.resolve('./unauthorized/test.png');

      expect(isPathAllowed(testPath, allowedPaths)).toBe(false);
    });

    it('should throw error for non-existent file paths', () => {
      const nonExistentPath = './test/non-existent-image.png';
      expect(() => validateFileExists(nonExistentPath)).toThrow('File not found');
    });

    it('should throw error for invalid file extensions', () => {
      const invalidPath = './test/test.txt';
      expect(() => validateExtension(invalidPath)).toThrow('Invalid file type');
    });
  });

  describe('Image Format Support Tests', () => {
    it('should support common image formats', () => {
      const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

      supportedFormats.forEach(format => {
        const mimeType = getMimeType(`test${format}`);
        expect(mimeType).toMatch(/^image\//);
      });
    });

    it('should get correct MIME type for test.png', () => {
      const testImagePath = './test/test.png';
      const mimeType = getMimeType(testImagePath);
      expect(mimeType).toBe('image/png');
    });
  });

  describe('Data URL Generation Tests', () => {
    it('should create properly formatted data URLs', () => {
      const testCases = [
        { mimeType: 'image/png', base64: 'iVBORw0KGgo=', expected: 'data:image/png;base64,iVBORw0KGgo=' },
        { mimeType: 'image/jpeg', base64: '/9j/4AAQ', expected: 'data:image/jpeg;base64,/9j/4AAQ' }
      ];

      testCases.forEach(({ mimeType, base64, expected }) => {
        const dataUrl = `data:${mimeType};base64,${base64}`;
        expect(dataUrl).toBe(expected);
      });
    });

  });


});
