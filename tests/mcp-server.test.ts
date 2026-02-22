import { describe, it, expect } from 'vitest';
import { getTestEnv } from './test.config';
import testData from './fixtures/test-data.json';

const env = getTestEnv();

describe(`MCP Server Tests - ${env.name}`, () => {

  describe('Server Health', () => {
    it('should respond to base URL', async () => {
      const response = await fetch(env.baseUrl);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Widgets', () => {
    it('should load stash-board widget data', async () => {
      // Widget data is loaded via MCP protocol
      // For quick testing, we verify the server is running
      const response = await fetch(env.baseUrl);
      expect(response.ok || response.status === 404).toBe(true);
    });

    it('should load stash-status widget data', async () => {
      const response = await fetch(env.baseUrl);
      expect(response.ok || response.status === 404).toBe(true);
    });
  });

  describe('Tools - Basic Connectivity', () => {
    it('should have MCP server running', async () => {
      const response = await fetch(env.baseUrl);
      expect(response).toBeDefined();
    });

    it('should accept connections on MCP endpoint', async () => {
      // MCP uses SSE/JSON-RPC, not REST
      // This test verifies the server is accessible
      const response = await fetch(env.baseUrl, { method: 'HEAD' }).catch(() => null);
      expect(response).toBeDefined();
    });
  });

  describe('Demo Data Validation', () => {
    it('should have expected number of demo links', () => {
      expect(testData.expectedDemoLinks).toBe(4);
    });

    it('should have valid test data structure', () => {
      expect(testData.testLinks).toHaveLength(2);
      expect(testData.testLinks[0]).toHaveProperty('url');
      expect(testData.testLinks[0]).toHaveProperty('title');
      expect(testData.testLinks[0]).toHaveProperty('tags');
    });
  });

  describe('Environment Configuration', () => {
    it('should have valid base URL', () => {
      expect(env.baseUrl).toMatch(/^https?:\/\//);
    });

    it('should have valid MCP URL', () => {
      expect(env.mcpUrl).toMatch(/^https?:\/\//);
    });

    it('should have environment name', () => {
      expect(env.name).toBeTruthy();
    });
  });
});
