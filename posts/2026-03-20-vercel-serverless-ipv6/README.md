# How to Configure Vercel Serverless Functions with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Vercel, Serverless, Edge Function, Next.js

Description: Understand IPv6 support for Vercel serverless and edge functions, handle IPv6 client addresses, and configure IPv6-aware routing in Next.js applications.

## Introduction

Vercel's edge network is dual-stack and accepts IPv6 connections. Serverless functions running on Vercel receive client IPv6 addresses via request headers. Edge Functions running on Vercel's V8 isolates have access to IPv6 client metadata.

## Accessing IPv6 Client Addresses in API Routes

```typescript
// pages/api/client-info.ts (Next.js API Route)
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vercel forwards client IP in x-forwarded-for
  const xff = req.headers["x-forwarded-for"] as string;
  const clientIp = xff ? xff.split(",")[0].trim() : req.socket.remoteAddress;

  // Vercel-specific header for real IP
  const vercelIp = req.headers["x-real-ip"] as string;

  res.json({
    client_ip: vercelIp || clientIp,
    is_ipv6: clientIp?.includes(":") ?? false,
    xff: xff,
  });
}
```

## Edge Functions with IPv6

```typescript
// middleware.ts - Vercel Edge Middleware
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const isIPv6 = clientIp.includes(":");

  // Add IPv6 info to response headers
  const response = NextResponse.next();
  response.headers.set("X-Client-IP", clientIp);
  response.headers.set("X-Client-Protocol", isIPv6 ? "IPv6" : "IPv4");

  // IPv6 geolocation via Vercel request headers
  // (request.geo was removed in Next.js 15 — read x-vercel-ip-* headers)
  const country = request.headers.get("x-vercel-ip-country") ?? "unknown";
  const city = request.headers.get("x-vercel-ip-city") ?? "unknown";
  response.headers.set("X-Client-Location", `${city}, ${country}`);

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
```

## IPv6 Rate Limiting by /64 Subnet

```typescript
// lib/rate-limit-ipv6.ts
const rateLimitStore = new Map<string, { count: number; reset: number }>();

function getIPv6RateKey(ip: string): string {
  if (!ip.includes(":")) {
    return ip;  // IPv4: use full address
  }
  // IPv6: use /64 prefix for rate limiting
  // Parse first 4 groups (64 bits)
  const groups = ip.split(":");
  if (groups.length < 4) return ip;
  return groups.slice(0, 4).join(":") + "::/64";
}

export function checkRateLimit(
  clientIp: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const key = getIPv6RateKey(clientIp);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.reset) {
    rateLimitStore.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}
```

## IPv6 in Next.js App Router

```typescript
// app/api/hello/route.ts (App Router)
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  const isIPv6 = clientIp.includes(":");

  return Response.json({
    message: "Hello from Vercel!",
    yourIP: clientIp,
    protocol: isIPv6 ? "IPv6" : "IPv4",
    // Vercel injects x-vercel-ip-* headers on both Edge and Node runtimes
    country: request.headers.get("x-vercel-ip-country") ?? "unknown",
  });
}

export const runtime = "edge";
```

## vercel.json Routing

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Vary",
          "value": "X-Forwarded-For"
        }
      ]
    }
  ]
}
```

## Conclusion

Vercel's platform is IPv6-ready. Client IPv6 addresses arrive in `x-forwarded-for` and `x-real-ip` headers. Use Edge Functions for low-latency IPv6-aware middleware. Implement /64-based rate limiting to prevent abuse from large IPv6 allocations. Monitor Vercel function response times and error rates with OneUptime using external synthetic monitoring.
