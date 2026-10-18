# HirePulse agent examples

Four small integrations for the live [HirePulse gateway](https://gethirepulse.xyz).
I maintain this service. These examples query public company data.

Five successful free calls per UTC day per IP are shared across lookup tools.
Empty results are not charged. After the allowance, x402 payments use USDC on Base.
Prices start at $0.005; hot-buyer profiles cost $0.25 per hot company. Batch and
hot-buyer scans have separate limits and a two-step quote flow.

All examples use `linear.app`. Python and TypeScript default to free-only mode:
HTTP 402 stops the example. They never read a wallet unless both `--pay` and
`--wallet-file` are supplied. No paid example was executed for this repository.

## 1. Python with optional x402 payments

```sh
python -m pip install -r python/requirements.txt
python python/client.py
```

To enable at most one payment of 0.005 USDC, run:

```sh
python python/client.py --pay --wallet-file /private/path/buyer.local.json
```

The local wallet file contains a `key` field. It stays outside the repository;
the key and signed authorization are never printed. The example validates the
network, token, recipient, endpoint and amount before signing, with no automatic
retry after a payment attempt. Only fund a separate test wallet.

## 2. TypeScript with optional x402 payments

```sh
npm ci
npm run typescript
# Optional, only after deciding to pay:
npm run typescript -- --pay --wallet-file /private/path/buyer.local.json
```

The same 0.005-USDC cap and recipient/network checks apply.
`npm run check` type-checks the example.

## 3. Claude Desktop with remote MCP

Merge [claude-desktop/config.json](claude-desktop/config.json) into your
`claude_desktop_config.json` and restart Claude Desktop. It uses the existing
`mcp-remote` npm proxy, so it works independently of our new npm package release.
On Windows, if `npx` cannot launch, use `cmd` with arguments
`["/c", "npx", "-y", "mcp-remote", "https://gethirepulse.xyz/mcp"]`.

Probe the same remote server using the official MCP SDK:

```sh
npm run mcp
```

The probe lists all eight tools, then calls `detect_website_tech_stack`.
The probe was run against the live server; Claude Desktop's graphical UI was
not automated. This config returns payment challenges after the free allowance;
it does not pay automatically.

## 4. n8n workflow

Import [n8n/workflow.json](n8n/workflow.json) into n8n and select **Execute workflow**.
It uses Manual Trigger and HTTP Request, with no credentials or community node.
It stops on HTTP 402 and never pays. CLI equivalent:

```sh
n8n execute --file=n8n/workflow.json --rawOutput
```

## Actual output

The live Python and TypeScript calls returned HTTP 200 with charged_micro_usd=0.
The MCP call reported eight tools and chargedMicroUsd=0. Full captured outputs
are under [output/](output/), including the gateway's `checked_at` timestamps.
For the captured Python response:

```json
{
  "http": 200,
  "charged_micro_usd": "0",
  "domain": "linear.app",
  "status": "ok",
  "technology_count": 3,
  "checked_at": "2026-10-18T14:26:36+00:00"
}
```

This is an excerpt, not the full response. Cached responses can have earlier
timestamps than the client execution. The payment branches are provided for
developers and have not been tested with real funds in this repository.

[Catalog](https://gethirepulse.xyz/v1/catalog) ·
[OpenAPI](https://gethirepulse.xyz/openapi.json) ·
[Python client](https://pypi.org/project/hirepulse-tools/) ·
[MCP proxy source](https://github.com/edtool79-collab/hirepulse-mcp)

MIT license.
