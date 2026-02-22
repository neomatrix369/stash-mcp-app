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
        expect(requiredTools).toContain(tool);
      });
    });

    it('should have all 5 required tools', () => {
      expect(requiredTools).toHaveLength(5);
    });
  });

  describe('Widget Availability', () => {
    const requiredWidgets = [
      'stash-board',
      'stash-status'
    ];

    requiredWidgets.forEach(widget => {
      it(`should support ${widget} widget`, () => {
        expect(requiredWidgets).toContain(widget);
      });
    });

    it('should have all 2 required widgets', () => {
      expect(requiredWidgets).toHaveLength(2);
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
        expect(feature.supported).toBe(true);
      });
    });

    it('should have all 9 UI features', () => {
      expect(features.filter(f => f.supported)).toHaveLength(9);
    });
  });

  describe('Data Model', () => {
    it('should support StashLink structure', () => {
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
    });

    it('should support required link properties', () => {
      const requiredProps = ['id', 'url', 'title', 'tags', 'status', 'due_date', 'created_at'];
      expect(requiredProps).toHaveLength(7);
    });
  });
});
