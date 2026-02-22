# Stash MCP App - Test Suite

Quick automated tests to verify all features work across all environments.

## Quick Start

```bash
# Run all tests (local environment)
npm test

# Test specific environment
TEST_ENV=local npm test
TEST_ENV=remote npm test
TEST_ENV=playground npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

## Test Structure

```
tests/
├── mcp-server.test.ts    # Server health & connectivity
├── features.test.ts      # Feature availability checks
├── test.config.ts        # Environment URLs
├── fixtures/             # Test data
│   └── test-data.json
└── README.md             # This file
```

## What's Tested

### ✅ MCP Server (mcp-server.test.ts)
- Server health check
- Widget loading (stash-board, stash-status)
- Tool connectivity
- Demo data validation
- Environment configuration

### ✅ Features (features.test.ts)
- All 5 MCP tools (add-link, update-link, delete-link, bulk-update, import-links)
- Both widgets (stash-board, stash-status)
- 9 UI features (filters, search, deadline radar, etc.)
- Data model validation

## Environments

| Environment | URL | Variable |
|-------------|-----|----------|
| **Local** | http://localhost:53362 | `TEST_ENV=local` |
| **Remote** | https://your-app-abc123.alpic.live | `TEST_ENV=remote` |
| **Playground** | https://your-app-abc123.alpic.live/try | `TEST_ENV=playground` |

## CI/CD Integration

Add to your GitHub Actions or CI pipeline:

```yaml
- name: Run tests on all environments
  run: |
    TEST_ENV=local npm test
    TEST_ENV=remote npm test
```

## Adding New Tests

1. Create a new test file in `tests/`
2. Import the test config: `import { getTestEnv } from './test.config'`
3. Use the environment URL: `const env = getTestEnv()`
4. Run tests: `npm test`

## Notes

- Tests are lightweight and fast (~2-3 seconds)
- Focus on feature validation and connectivity
- For full E2E browser testing, use Playwright (not included for speed)
- All tests pass if server is running correctly
