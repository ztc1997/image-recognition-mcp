#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { z } from "zod";
import { isPathLocal, validateLocalPath, validateUrlDomain } from "./path-validator.js";
import { createLocalImageContent, createUrlImageContent } from "./image-processor.js";

const openai = new OpenAI();

// Get the model from environment variable or use default
const model = process.env.OPENAI_MODEL || "gpt-5-mini";

// Get allowed paths from environment variable or use default
const allowedPaths = process.env.ALLOWED_IMAGE_PATHS
  ? process.env.ALLOWED_IMAGE_PATHS.split(',').map(p => p.trim())
  : ['./images', './assets'];

// Check if all paths should be allowed (only for image files)
const allowAllPaths = process.env.ALLOW_ALL_PATHS === 'true';

// Get allowed domains from environment variable (optional security feature)
const allowedDomains = process.env.ALLOWED_DOMAINS
  ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim())
  : null; // null means all domains are allowed

// Create an MCP server
const server = new McpServer(
  {
    name: "Image Recognition",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        list: true,
        call: true,
      },
    },
  }
);

server.registerTool(
  "describe-image",
  {
    title: "Describe Image",
    description: "Describe an image by URL or local file path with a custom prompt",
    inputSchema: {
      imageUrl: z.string().describe("The image url or local file path to describe"),
      prompt: z.string().describe("The question or prompt to ask about the image").default("what's in this image?"),
    },
  },
  async ({ imageUrl, prompt }: { imageUrl: string; prompt: string }) => {
    let imageContent: { type: "image_url"; image_url: { url: string } };

    // Check if the input is a local file path
    if (isPathLocal(imageUrl)) {
      // Validate and get absolute path
      const absolutePath = validateLocalPath(imageUrl, allowedPaths, allowAllPaths);

      // Convert local file to image content
      imageContent = await createLocalImageContent(absolutePath);
    } else {
      // Handle as URL - validate domain if ALLOWED_DOMAINS is set
      validateUrlDomain(imageUrl, allowedDomains);

      // Create URL image content
      imageContent = createUrlImageContent(imageUrl);
    }

    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              imageContent,
            ],
          },
        ],
      });
      return {
        content: [{ type: "text", text: response.choices[0].message.content ?? "" }],
      };
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      return {
        content: [{ type: "text", text: `Error describing the image: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the server logs.` }],
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
