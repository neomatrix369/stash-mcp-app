/**
 * Get base URL from environment variable or prompt user
 */
function getRemoteBaseUrl(): string {
  const baseUrl = process.env.REMOTE_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      'REMOTE_BASE_URL environment variable is required for remote/playground tests.\n' +
      'Example: export REMOTE_BASE_URL="https://your-app-abc123.alpic.live"\n' +
      'Then run: npm test'
    );
  }

  return baseUrl;
}

// Test configuration for all environments
export const TEST_ENVIRONMENTS = {
  local: {
    name: 'Local',
    baseUrl: 'http://localhost:3000',
    mcpUrl: 'http://localhost:3000/mcp'
  },
  remote: {
    name: 'Remote (Alpic)',
    get baseUrl() { return getRemoteBaseUrl(); },
    get mcpUrl() { return `${getRemoteBaseUrl()}/mcp`; }
  },
  playground: {
    name: 'Playground',
    get baseUrl() { return `${getRemoteBaseUrl()}/try`; },
    get mcpUrl() { return `${getRemoteBaseUrl()}/mcp`; }
  }
};

// Get environment from env var or default to local
export const getTestEnv = () => {
  const env = process.env.TEST_ENV || 'local';
  return TEST_ENVIRONMENTS[env as keyof typeof TEST_ENVIRONMENTS];
};
