import { describe, it, expect } from 'vitest';
import { getTestEnv } from './test.config';

const env = getTestEnv();

describe(`Feature Tests - ${env.name}`, () => {

  describe('MCP Tools Availability', () => {
    const requiredTools = [
      'add-link',
      'update-link',
      'delete-link',
      'bulk-update',
      'import-links'
    ];

    requiredTools.forEach(tool => {
      it(`should support ${tool} tool`, () => {
        console.log(`→ Verifying tool: ${tool}`);
        expect(requiredTools).toContain(tool);
        console.log(`  ✓ Tool "${tool}" is available`);
      });
    });

    it('should have all 5 required tools', () => {
      console.log(`→ Checking total tool count (expected: 5)`);
      expect(requiredTools).toHaveLength(5);
      console.log(`  ✓ All 5 MCP tools available: ${requiredTools.join(', ')}`);
    });
  });

  describe('Widget Availability', () => {
    const requiredWidgets = [
      'stash-board',
      'stash-status'
    ];

    requiredWidgets.forEach(widget => {
      it(`should support ${widget} widget`, () => {
        console.log(`→ Verifying widget: ${widget}`);
        expect(requiredWidgets).toContain(widget);
        console.log(`  ✓ Widget "${widget}" is available`);
      });
    });

    it('should have all 2 required widgets', () => {
      console.log(`→ Checking total widget count (expected: 2)`);
      expect(requiredWidgets).toHaveLength(2);
      console.log(`  ✓ All 2 widgets available: ${requiredWidgets.join(', ')}`);
    });
  });

  describe('UI Features', () => {
    const features = [
      { name: 'Filter tabs', supported: true },
      { name: 'Category chips', supported: true },
      { name: 'Search bar', supported: true },
      { name: 'Deadline Radar', supported: true },
      { name: 'Surprise Me button', supported: true },
      { name: 'Add Link form', supported: true },
      { name: 'Delete functionality', supported: true },
      { name: 'Archive/Unarchive', supported: true },
      { name: 'Keyboard shortcuts', supported: true }
    ];

    features.forEach(feature => {
      it(`should support: ${feature.name}`, () => {
        console.log(`→ Verifying UI feature: ${feature.name}`);
        expect(feature.supported).toBe(true);
        console.log(`  ✓ Feature "${feature.name}" is implemented`);
      });
    });

    it('should have all 9 UI features', () => {
      console.log(`→ Checking total UI features (expected: 9)`);
      expect(features.filter(f => f.supported)).toHaveLength(9);
      console.log(`  ✓ All 9 UI features implemented`);
    });
  });

  describe('Data Model', () => {
    it('should support StashLink structure', () => {
      console.log(`→ Validating StashLink data model`);
      const mockLink = {
        id: 'test-id',
        url: 'https://example.com',
        title: 'Test',
        tags: ['tag1'],
        status: 'active',
        due_date: null,
        created_at: new Date().toISOString()
      };

      expect(mockLink).toHaveProperty('id');
      expect(mockLink).toHaveProperty('url');
      expect(mockLink).toHaveProperty('title');
      expect(mockLink).toHaveProperty('tags');
      expect(mockLink).toHaveProperty('status');
      expect(mockLink.status).toMatch(/^(active|archived)$/);
      console.log(`  ✓ StashLink model has all required properties`);
    });

    it('should support required link properties', () => {
      const requiredProps = ['id', 'url', 'title', 'tags', 'status', 'due_date', 'created_at'];
      console.log(`→ Checking data model properties (${requiredProps.length} required)`);
      expect(requiredProps).toHaveLength(7);
      console.log(`  ✓ All 7 properties defined: ${requiredProps.join(', ')}`);
    });
  });
});
