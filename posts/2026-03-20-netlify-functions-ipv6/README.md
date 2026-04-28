# How to Configure Netlify Functions with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Netlify, Serverless, Edge Function, JavaScript

Description: Handle IPv6 client addresses in Netlify Functions and Edge Functions, including accessing client IPs, rate limiting, and logging IPv6 traffic.

## Introduction

Netlify's CDN and edge network is dual-stack, serving IPv6 clients natively. Netlify Functions (AWS Lambda-based) and Netlify Edge Functions receive client IP addresses via request context. Understanding how to access and process IPv6 addresses is essential for logging, rate limiting, and personalization.

## IPv6 in Netlify Functions (Lambda)

```javascript
// netlify/functions/client-info.js
exports.handler = async (event, context) => {
  // Client IP from headers (Netlify uses x-forwarded-for)
  const clientIp =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    event.headers["x-nf-client-connection-ip"] ??
    "unknown";

  const isIPv6 = clientIp.includes(":");

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ip: clientIp,
      protocol: isIPv6 ? "IPv6" : "IPv4",
      country: event.headers["x-country"] ?? "unknown",
      // Netlify provides geo headers
      city: event.headers["x-city"] ?? "unknown",
    }),
  };
};
```

## IPv6 in Netlify Edge Functions

```typescript
// netlify/edge-functions/ipv6-info.ts
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // In Edge Functions, use context.ip (the x-nf-client-connection-ip
  // header is no longer exposed to edge handlers).
  const clientIp = context.ip ?? "unknown";

  const isIPv6 = clientIp.includes(":");

  // Netlify context provides geo data
  const geo = context.geo;

  return new Response(
    JSON.stringify({
      ip: clientIp,
      protocol: isIPv6 ? "IPv6" : "IPv4",
      country: geo?.country?.name ?? "unknown",
      city: geo?.city ?? "unknown",
      latitude: geo?.latitude,
      longitude: geo?.longitude,
    }),
    {
      headers: {
        "content-type": "application/json",
        "x-served-by": "edge",
      },
    }
  );
};

export const config = {
  path: "/api/ipv6-info",
};
```

## IPv6-Aware Rate Limiting in Edge Functions

```typescript
// netlify/edge-functions/rate-limit.ts
import type { Context } from "@netlify/edge-functions";

// In-memory store (resets per isolate instance)
const requestCounts = new Map<string, number>();

function getRateLimitKey(ip: string): string {
  if (!ip.includes(":")) return ip;
  // Use /64 subnet for IPv6 rate limiting
  const parts = ip.split(":");
  // Normalize to first 4 groups
  return parts.slice(0, 4).join(":") + "::";
}

export default async (request: Request, context: Context) => {
  const clientIp = context.ip ?? "unknown";
  const key = getRateLimitKey(clientIp);

  const current = requestCounts.get(key) ?? 0;
  if (current >= 50) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  requestCounts.set(key, current + 1);
  return context.next();
};
```

## IPv6 Logging in Netlify Functions

```javascript
// netlify/functions/api.js
const { createLogger } = require("winston");
const { transports, format } = require("winston");

const logger = createLogger({
  format: format.json(),
  transports: [new transports.Console()],
});

exports.handler = async (event) => {
  const clientIp =
    event.headers["x-nf-client-connection-ip"] ??
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? "unknown";

  // Log with IPv6 info
  logger.info("API request", {
    ip: clientIp,
    isIPv6: clientIp.includes(":"),
    path: event.path,
    method: event.httpMethod,
    country: event.headers["x-country"],
  });

  return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
};
```

## netlify.toml Configuration

```toml
# netlify.toml

[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[edge_functions]]
  path = "/api/*"
  function = "ipv6-info"

# No special IPv6 config needed - Netlify handles it at CDN layer
```

## Conclusion

Netlify's platform handles IPv6 transparently at the CDN layer. Lambda-style Functions receive client IPs via `x-nf-client-connection-ip` (most reliable) or `x-forwarded-for`, while Edge Functions expose them via `context.ip`. Edge Functions provide low-latency IPv6-aware processing with access to geo context. Implement /64-based rate limiting to handle IPv6's large allocations. Monitor Netlify function invocation rates and errors with OneUptime.
