#!/usr/bin/env node
/**
 * Dealflow Alerts MCP Server
 *
 * Exposes read access to deals and basic alert management as MCP tools.
 * Communicates with /api/v1/ over HTTPS using a Bearer token from
 * DEALFLOW_API_TOKEN (env). Base URL overridable via DEALFLOW_API_URL.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = (process.env.DEALFLOW_API_URL ?? "https://dealflowalerts.com/api/v1").replace(/\/$/, "");
const API_TOKEN = process.env.DEALFLOW_API_TOKEN ?? "";

if (!API_TOKEN) {
  console.error("[dealflowalerts-mcp] DEALFLOW_API_TOKEN env var is required");
  process.exit(1);
}

async function apiCall(method: string, path: string, body?: unknown): Promise<unknown> {
  const url = `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
  const init: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`,
      "Accept": "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!res.ok) {
    const errBody = parsed as { error?: { message?: string } };
    throw new Error(`API ${res.status}: ${errBody?.error?.message ?? text.slice(0, 200)}`);
  }
  return parsed;
}

const server = new McpServer({
  name: "dealflowalerts",
  version: "0.1.0",
});

server.tool(
  "deals_search",
  "Search aggregated deal listings across marketplaces (Acquire.com, Flippa, Empire Flippers, etc.). Returns up to 100 deals, cursor-paginated. Example: { sourceId: 3, minPrice: 10000, keywords: 'saas' }",
  {
    sourceId: z.string().optional().describe("Single source id, or comma-separated list (e.g. '3,5,7')"),
    keywords: z.string().optional().describe("Comma-separated keywords matched against title and description"),
    minMRR: z.number().optional(),
    maxMRR: z.number().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    businessModel: z.string().optional(),
    listingMethod: z.string().optional(),
    cursor: z.string().optional().describe("Pagination cursor returned by a previous call"),
    limit: z.number().int().min(1).max(100).optional().describe("Page size, max 100"),
  },
  async (args) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const result = await apiCall("GET", `/deals${qs.toString() ? "?" + qs.toString() : ""}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "deals_get",
  "Fetch full details for a single deal by id. Example: { id: 42 }",
  { id: z.number().int().positive() },
  async ({ id }) => {
    const result = await apiCall("GET", `/deals/${id}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "alerts_list",
  "List the user's saved alerts (search criteria + delivery preferences).",
  {},
  async () => {
    const result = await apiCall("GET", "/alerts");
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "alerts_create",
  "Create a new saved alert. Required: label, email, frequency (0=test, 1=daily, 7=weekly, 30=monthly). Optional: keywords, source_ids (array of int), min_mrr/max_mrr/min_price/max_price, business_model, listing_method.",
  {
    label: z.string().min(1).max(100),
    email: z.string(),
    frequency: z.union([z.literal(0), z.literal(1), z.literal(7), z.literal(30)]),
    keywords: z.string().optional(),
    source_ids: z.array(z.number().int()).optional(),
    min_mrr: z.number().optional(),
    max_mrr: z.number().optional(),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
    business_model: z.string().optional(),
    listing_method: z.string().optional(),
  },
  async (args) => {
    const result = await apiCall("POST", "/alerts", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "account_me",
  "Return the authenticated user's plan, rate limits, and today's API usage.",
  {},
  async () => {
    const result = await apiCall("GET", "/account/me");
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
