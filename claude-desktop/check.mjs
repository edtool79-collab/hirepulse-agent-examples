import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const client = new Client({ name: 'hirepulse-examples', version: '1.0.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL('https://gethirepulse.xyz/mcp')));
  const list = await client.listTools();
  const result = await client.callTool({ name: 'detect_website_tech_stack', arguments: { domain: 'linear.app' } });
  console.log(JSON.stringify({ tool_count: list.tools.length, result }, null, 2));
  if (result.isError) process.exitCode = 1;
} finally { await client.close(); }
