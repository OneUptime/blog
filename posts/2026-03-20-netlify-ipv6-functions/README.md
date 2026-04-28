# How to Configure Netlify Functions IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netlify, IPv6, Function, Serverless, Dual-Stack, JAMstack

Description: Configure Netlify Functions to handle IPv6 client requests and integrate with IPv6 backend services.

## Introduction

Netlify Functions run on a dual-stack platform, so client requests can arrive over either IPv4 or IPv6. This guide covers reading IPv6 client addresses from Netlify's request headers, calling IPv6 backends from a function, and validating IPv6 client connectivity to your site. Netlify Functions support JavaScript/TypeScript (Node.js) and Go runtimes, so the examples below use Node.js.

## Step 1: Enable IPv6 on the Platform

```bash
# Netlify's CDN and edge network is dual-stack by default,
# so deployed sites and functions are reachable over IPv6
# without per-site configuration.

# Check that your Netlify site's public endpoint has IPv6
dig AAAA your-site.netlify.app

# Check that a function endpoint resolves over IPv6
dig AAAA your-site.netlify.app
# Functions are exposed at https://your-site.netlify.app/.netlify/functions/<name>
```

## Step 2: Handle IPv6 Client Addresses in Functions

```javascript
// netlify/functions/client-info.js
// Netlify Functions v1 (Lambda-compatible) handler
exports.handler = async (event, context) => {
  // Extract client IP from Netlify-provided headers.
  // x-nf-client-connection-ip is Netlify's most reliable source.
  const rawIp =
    event.headers["x-nf-client-connection-ip"] ??
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    "unknown";

  // Normalize IPv4-mapped IPv6 addresses (e.g. ::ffff:1.2.3.4 -> 1.2.3.4)
  const mapped = rawIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const clientIp = mapped ? mapped[1] : rawIp;
  const isIPv6 = !mapped && clientIp.includes(":");

  return {
    statusCode: 200,
    body: `Client IP: ${clientIp}, IPv6: ${isIPv6}`,
  };
};
```

## Step 3: Make Outbound IPv6 Requests

```javascript
// Make HTTP request to an IPv6 endpoint from a Netlify Function.
// Node.js 18+ (Netlify's default runtime) ships fetch and AbortSignal.timeout.
async function callIpv6Endpoint() {
  // URL with bracketed IPv6 address (RFC 3986)
  const url = "http://[2001:db8::1]/api/health";

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
    return await response.text();
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// Returning JSON from the same endpoint
async function callIpv6Json() {
  const response = await fetch("http://[2001:db8::1]/api", {
    signal: AbortSignal.timeout(10_000),
  });
  return await response.json();
}
```

## Step 4: Test IPv6 Connectivity

```bash
# Test that your Netlify site/function accepts IPv6
curl -6 https://your-site.netlify.app/.netlify/functions/client-info

# Test with explicit IPv6 address (note brackets around the IPv6 address)
curl --resolve "your-site.netlify.app:443:[2001:db8::1]" \
    https://your-site.netlify.app/.netlify/functions/client-info

# Check IPv6 DNS
dig AAAA your-site.netlify.app
```

## Step 5: Environment Variable Configuration

```toml
# netlify.toml - build-time environment variables
# For secrets, prefer setting variables in the Netlify UI
# (Site configuration -> Environment variables) or via
# `netlify env:set KEY value` so they are not committed to git.

[build.environment]
  BACKEND_URL = "http://[2001:db8::backend]/api"
  DATABASE_HOST = "2001:db8::db"
```

```javascript
// In your function code
const backendUrl = process.env.BACKEND_URL ?? "http://[::1]/api";
```

## Step 6: Monitoring and Logging

```javascript
// netlify/functions/log-metrics.js
function logIpv6Metrics(clientIp) {
  if (!clientIp || clientIp === "unknown") {
    console.warn(`Invalid IP address: ${clientIp}`);
    return;
  }

  const isIPv6 = clientIp.includes(":");

  // Netlify captures stdout/stderr from functions and exposes it
  // via the function logs UI. JSON-formatted lines parse cleanly.
  console.log(
    JSON.stringify({
      event: "request",
      client_ip: clientIp,
      ip_version: isIPv6 ? 6 : 4,
    }),
  );
}
```

## Conclusion

Netlify's edge handles IPv6 transparently, so most of the work is on the function side: read the client IP from `x-nf-client-connection-ip` (falling back to `x-forwarded-for`), normalize IPv4-mapped IPv6 addresses, and use bracket notation for IPv6 URLs in outbound requests. Monitor function invocations from IPv6 clients with OneUptime to track adoption and error rates.
