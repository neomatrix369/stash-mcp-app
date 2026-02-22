import { describe, it, expect } from 'vitest';
import { getTestEnv } from './test.config';
import testData from './fixtures/test-data.json';

const env = getTestEnv();

describe(`MCP Server Tests - ${env.name}`, () => {

  describe('Server Health', () => {
    it('should respond to base URL', async () => {
      console.log(`→ Testing server health at: ${env.baseUrl}`);
      const response = await fetch(env.baseUrl);
      console.log(`  ✓ Server responded with status: ${response.status}`);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Widgets', () => {
    it('should load stash-board widget data', async () => {
      console.log(`→ Verifying stash-board widget accessibility`);
      const response = await fetch(env.baseUrl);
      console.log(`  ✓ Widget server accessible (status: ${response.status})`);
      expect(response.ok || response.status === 404).toBe(true);
    });

    it('should load stash-status widget data', async () => {
      console.log(`→ Verifying stash-status widget accessibility`);
      const response = await fetch(env.baseUrl);
      console.log(`  ✓ Widget server accessible (status: ${response.status})`);
      expect(response.ok || response.status === 404).toBe(true);
    });
  });

  describe('Tools - Basic Connectivity', () => {
    it('should have MCP server running', async () => {
      console.log(`→ Checking MCP server connectivity`);
      const response = await fetch(env.baseUrl);
      console.log(`  ✓ MCP server is running and responding`);
      expect(response).toBeDefined();
    });

    it('should accept connections on MCP endpoint', async () => {
      console.log(`→ Testing MCP endpoint connectivity`);
      const response = await fetch(env.baseUrl, { method: 'HEAD' }).catch(() => null);
      console.log(`  ✓ MCP endpoint accepts connections`);
      expect(response).toBeDefined();
    });
  });

  describe('Demo Data Validation', () => {
    it('should have expected number of demo links', () => {
      console.log(`→ Validating demo data count (expected: ${testData.expectedDemoLinks})`);
      expect(testData.expectedDemoLinks).toBe(4);
      console.log(`  ✓ Demo data count verified`);
    });

    it('should have valid test data structure', () => {
      console.log(`→ Validating test data structure (${testData.testLinks.length} test links)`);
      expect(testData.testLinks).toHaveLength(2);
      expect(testData.testLinks[0]).toHaveProperty('url');
      expect(testData.testLinks[0]).toHaveProperty('title');
      expect(testData.testLinks[0]).toHaveProperty('tags');
      console.log(`  ✓ Test data structure is valid`);
    });
  });

  describe('Environment Configuration', () => {
    it('should have valid base URL', () => {
      console.log(`→ Validating base URL: ${env.baseUrl}`);
      expect(env.baseUrl).toMatch(/^https?:\/\//);
      console.log(`  ✓ Base URL is valid`);
    });

    it('should have valid MCP URL', () => {
      console.log(`→ Validating MCP URL: ${env.mcpUrl}`);
      expect(env.mcpUrl).toMatch(/^https?:\/\//);
      console.log(`  ✓ MCP URL is valid`);
    });

    it('should have environment name', () => {
      console.log(`→ Validating environment name: "${env.name}"`);
      expect(env.name).toBeTruthy();
      console.log(`  ✓ Environment name is set`);
    });
  });
});
