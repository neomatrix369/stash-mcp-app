// Test configuration for all environments
export const TEST_ENVIRONMENTS = {
  local: {
    name: 'Local',
    baseUrl: 'http://localhost:3000',
    mcpUrl: 'http://localhost:3000/mcp'
  },
  remote: {
    name: 'Remote (Alpic)',
    baseUrl: 'https://your-app-abc123.alpic.live',
    mcpUrl: 'https://your-app-abc123.alpic.live/mcp'
  },
  playground: {
    name: 'Playground',
    baseUrl: 'https://your-app-abc123.alpic.live/try',
    mcpUrl: 'https://your-app-abc123.alpic.live/mcp'
  }
};

// Get environment from env var or default to local
export const getTestEnv = () => {
  const env = process.env.TEST_ENV || 'local';
  return TEST_ENVIRONMENTS[env as keyof typeof TEST_ENVIRONMENTS];
};
