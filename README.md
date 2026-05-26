# @dealflowalerts/mcp-server

Model Context Protocol server for [Dealflow Alerts](https://dealflowalerts.com). Lets Claude (and any other MCP-compatible client) query aggregated business-for-sale listings, manage saved alerts, and read account info directly from a chat.

Requires a **PRO** or **Agency** subscription and an API token generated at <https://dealflowalerts.com/settings/api>.

## Install

```bash
npm install -g @dealflowalerts/mcp-server
# or use npx, no install needed
```

## Configure (Claude Desktop / Claude Code)

Add to `claude_desktop_config.json` (or the equivalent MCP config):

```json
{
  "mcpServers": {
    "dealflowalerts": {
      "command": "npx",
      "args": ["-y", "@dealflowalerts/mcp-server"],
      "env": {
        "DEALFLOW_API_TOKEN": "dfa_live_..."
      }
    }
  }
}
```

The token is stored in plaintext on disk – treat the config file like an SSH key.

## Tools

| Tool | Purpose |
|------|---------|
| `deals_search` | Filter deals by source, price, MRR, keywords, business model. Cursor-paginated. |
| `deals_get` | Fetch a single deal by id. |
| `alerts_list` | List your saved alerts. |
| `alerts_create` | Create a new saved alert. |
| `account_me` | Plan, rate limits, today's API usage. |

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `DEALFLOW_API_TOKEN` | (required) | Bearer token from /settings/api |
| `DEALFLOW_API_URL` | `https://dealflowalerts.com/api/v1` | Override (e.g. for local dev) |

## Develop

```bash
npm install
npm run build
DEALFLOW_API_TOKEN=dfa_live_... node dist/index.js
```
