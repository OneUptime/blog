# How to Configure Deployment on Vercel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vercel, Deployment, Next.js, CI/CD, Environment Variable, Serverless, Edge Function, DevOps

Description: A comprehensive guide to configuring and optimizing Vercel deployments, covering project setup, environment variables, build settings, and production best practices.

---

> Vercel provides a seamless deployment experience for modern web applications, but getting the configuration right requires understanding its features and options. This guide covers everything from basic setup to advanced deployment strategies.

Whether you are deploying a Next.js application, a static site, or a full-stack application with serverless functions, Vercel offers powerful configuration options to optimize your deployment.

---

## Project Setup and Configuration

Start by understanding the core configuration file and project structure.

```mermaid
flowchart TD
    A[Git Push] --> B[Vercel Detection]
    B --> C{Framework Detected?}
    C -->|Yes| D[Apply Framework Preset]
    C -->|No| E[Use vercel.json Config]
    D --> F[Build Process]
    E --> F
    F --> G[Deploy to Edge Network]
    G --> H[Live Application]
```

### Basic vercel.json Configuration

Create a `vercel.json` file in your project root to customize deployment behavior.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["iad1"],
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "public": false
}
```

### Configuration Options Explained

```typescript
// vercel.json with detailed comments
// Note: JSON does not support comments, this is for explanation only

const vercelConfig = {
  // Schema for IDE autocompletion
  "$schema": "https://openapi.vercel.sh/vercel.json",

  // Target regions for serverless functions
  // iad1 = US East, sfo1 = US West, cdg1 = Europe, etc.
  // Multiple regions require an Enterprise plan
  "regions": ["iad1"],

  // Custom build command (overrides framework default)
  "buildCommand": "npm run build",

  // Custom install command
  "installCommand": "npm ci",

  // Development command for vercel dev
  "devCommand": "npm run dev",

  // Build output directory
  "outputDirectory": ".next",

  // Framework preset
  "framework": "nextjs",

  // Git settings
  "git": {
    "deploymentEnabled": true
  }
};
```

---

## Environment Variables Configuration

Properly managing environment variables is crucial for secure deployments.

### Setting Environment Variables in Vercel Dashboard

Navigate to your project settings and configure environment variables for each environment.

```mermaid
flowchart LR
    A[Environment Variables] --> B[Production]
    A --> C[Preview]
    A --> D[Development]

    B --> E[Deployed main branch]
    C --> F[PR and branch deploys]
    D --> G[Local vercel dev]
```

### Using vercel.json for Environment Variables

Use the dashboard or Vercel CLI for secrets and environment-specific values. `env` and `build.env` in `vercel.json` are legacy options and should only be used for static, non-secret values when you specifically need file-based configuration.

```json
{
  "env": {
    "API_VERSION": "v2"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_API_URL": "https://api.myapp.com",
      "DATABASE_URL": "@database-url"
    }
  }
}
```

### Environment Variable Types

```typescript
// Different types of environment variables in Next.js on Vercel

// 1. Server-only variables (secure, not exposed to browser)
// Set in Vercel dashboard or vercel.json
process.env.DATABASE_URL;        // Only accessible in server code
process.env.API_SECRET_KEY;      // Never sent to browser

// 2. Public variables (exposed to browser)
// Must start with NEXT_PUBLIC_
process.env.NEXT_PUBLIC_API_URL; // Available in both server and browser
process.env.NEXT_PUBLIC_GA_ID;   // Safe to expose

// 3. System variables (auto-set by Vercel)
process.env.VERCEL;              // "1" when running on Vercel
process.env.VERCEL_ENV;          // "production", "preview", or "development"
process.env.VERCEL_URL;          // Deployment URL without protocol
process.env.VERCEL_REGION;       // Current region (e.g., "iad1")
```

### Creating Environment Variable Files

```bash
# .env.local - Local development (git ignored)

DATABASE_URL=postgresql://localhost:5432/mydb
API_SECRET_KEY=local-secret-key
NEXT_PUBLIC_API_URL=http://localhost:3001

# .env.production - Production defaults (can be committed)
NEXT_PUBLIC_API_URL=https://api.myapp.com
NEXT_PUBLIC_SITE_URL=https://myapp.com

# .env.development - Development defaults
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Linked Environment Variables

Use Vercel CLI to manage environment variables securely.

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# Pull environment variables to local .env file
vercel env pull .env.local

# Add a new environment variable
vercel env add DATABASE_URL production

# List all environment variables
vercel env ls

# Remove an environment variable
vercel env rm DATABASE_URL production
```

---

## Build Configuration

Customize the build process for optimal performance.

### Custom Build Settings

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci --legacy-peer-deps",
  "framework": "nextjs",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    },
    "app/api/**/route.ts": {
      "maxDuration": 10
    }
  }
}
```

### Memory and Duration Settings

```mermaid
flowchart TD
    A[Function Request] --> B{Check Limits}
    B --> C[Memory: plan default, dashboard configurable on Pro/Enterprise]
    B --> D[Duration: plan-dependent maxDuration]
    C --> E{Exceeds Limit?}
    D --> E
    E -->|Yes| F[Function Error]
    E -->|No| G[Execute Function]
```

### Configuring Function Regions

```json
{
  "regions": ["iad1"],
  "functions": {
    "api/user/**": {
      "maxDuration": 30
    },
    "api/heavy-computation.ts": {
      "maxDuration": 60
    }
  }
}
```

---

## Routing and Rewrites

Configure URL routing, redirects, and rewrites.

### Basic Rewrites

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.mybackend.com/:path*"
    },
    {
      "source": "/blog/:slug",
      "destination": "/posts/:slug"
    },
    {
      "source": "/old-page",
      "destination": "/new-page"
    }
  ]
}
```

### Redirects

```json
{
  "redirects": [
    {
      "source": "/old-blog/:slug",
      "destination": "/blog/:slug",
      "permanent": true
    },
    {
      "source": "/github",
      "destination": "https://github.com/myorg/myrepo",
      "permanent": false
    },
    {
      "source": "/docs/:path((?!v2/).*)",
      "destination": "/docs/v2/:path*",
      "permanent": false
    }
  ]
}
```

### Headers Configuration

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## Edge Configuration

Deploy functions at the edge for better performance.

### Edge Functions

```typescript
// app/api/geo/route.ts
// Edge function for geolocation-based responses

import { NextRequest, NextResponse } from "next/server";
import { geolocation } from "@vercel/functions";

// Configure as Edge Function
export const runtime = "edge";

export async function GET(request: NextRequest) {
  // Access geolocation data (available at the edge)
  const { country, city, countryRegion } = geolocation(request);

  return NextResponse.json({
    country: country || "Unknown",
    city: city || "Unknown",
    region: countryRegion || "Unknown",
    timestamp: new Date().toISOString(),
  });
}
```

### Edge Middleware

```typescript
// middleware.ts
// Runs on every request at the edge

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { geolocation } from "@vercel/functions";

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;

  // Add custom header
  const response = NextResponse.next();
  response.headers.set("x-custom-header", "my-value");

  // Geolocation-based routing
  const { country = "US" } = geolocation(request);

  // Redirect to country-specific page
  if (pathname === "/" && country !== "US") {
    return NextResponse.redirect(
      new URL(`/${country.toLowerCase()}`, request.url)
    );
  }

  // A/B testing with cookies
  const bucket = request.cookies.get("ab-bucket")?.value;
  if (!bucket) {
    const newBucket = Math.random() < 0.5 ? "a" : "b";
    response.cookies.set("ab-bucket", newBucket, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all paths except static files and api
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### Edge Config for Feature Flags

```typescript
// lib/feature-flags.ts
// Using Vercel Edge Config for dynamic configuration

import { createClient } from "@vercel/edge-config";

const edgeConfig = createClient(process.env.EDGE_CONFIG);

export async function getFeatureFlags() {
  try {
    const flags = await edgeConfig.getAll();
    return {
      newCheckout: flags.newCheckout ?? false,
      darkMode: flags.darkMode ?? true,
      betaFeatures: flags.betaFeatures ?? false,
    };
  } catch (error) {
    console.error("Failed to fetch feature flags:", error);
    return {
      newCheckout: false,
      darkMode: true,
      betaFeatures: false,
    };
  }
}
```

```typescript
// Usage in a page
// app/page.tsx
import { getFeatureFlags } from "@/lib/feature-flags";

export default async function HomePage() {
  const flags = await getFeatureFlags();

  return (
    <main>
      {flags.newCheckout ? <NewCheckoutFlow /> : <LegacyCheckout />}
    </main>
  );
}
```

---

## Caching and Performance

Configure caching for optimal performance.

### Cache-Control Headers

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/api/static-data",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### ISR Configuration in Next.js

```typescript
// app/products/[id]/page.tsx
// Configure Incremental Static Regeneration

// Revalidate every 60 seconds
export const revalidate = 60;

// Or use on-demand revalidation
// export const revalidate = false;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  return <ProductDetails product={product} />;
}
```

```typescript
// For on-demand revalidation, create an API route
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const path = searchParams.get("path");
  const tag = searchParams.get("tag");

  // Validate secret token
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    if (path) {
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, path });
    }

    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({ revalidated: true, tag });
    }

    return NextResponse.json({ error: "Missing path or tag" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
```

---

## Monorepo Configuration

Configure Vercel for monorepo deployments.

### Turborepo Configuration

```json
{
  "buildCommand": "cd ../.. && turbo run build --filter=web",
  "installCommand": "cd ../.. && npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

### Root Directory Setting

```json
{
  "framework": "nextjs",
  "ignoreCommand": "npx turbo-ignore"
}
```

### Project Structure for Monorepo

```mermaid
flowchart TD
    A[monorepo/] --> B[apps/]
    A --> C[packages/]
    A --> D[turbo.json]

    B --> E[web/]
    B --> F[admin/]
    B --> G[docs/]

    C --> H[ui/]
    C --> I[config/]
    C --> J[utils/]

    E --> K[vercel.json]
    F --> L[vercel.json]
    G --> M[vercel.json]
```

### Shared Configuration

```typescript
// packages/config/vercel.shared.ts
// Shared Vercel configuration for monorepo apps

import type { VercelConfig } from "@vercel/config/v1";

export const sharedConfig: VercelConfig = {
  regions: ["iad1"],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};
```

```typescript
// apps/web/vercel.ts
// Extend shared configuration
import type { VercelConfig } from "@vercel/config/v1";
import { sharedConfig } from "@myorg/config/vercel.shared";

export const config: VercelConfig = {
  ...sharedConfig,
  buildCommand: "cd ../.. && turbo run build --filter=web",
};
```

---

## Preview Deployments

Configure preview deployments for pull requests.

### Branch-Specific Configuration

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "staging": true,
      "develop": true
    }
  }
}
```

### Preview Environment Variables

```typescript
// Using VERCEL_ENV to determine environment
const getApiUrl = () => {
  switch (process.env.VERCEL_ENV) {
    case "production":
      return "https://api.myapp.com";
    case "preview":
      return "https://staging-api.myapp.com";
    default:
      return "http://localhost:3001";
  }
};

// Or use VERCEL_URL for preview-specific URLs
const getSiteUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
};
```

### Comment Integration

```json
{
  "github": {
    "autoAlias": true,
    "autoJobCancelation": true
  }
}
```

---

## Domain Configuration

Configure custom domains and SSL.

### Vercel CLI Domain Setup

```bash
vercel domains add myapp.com my-application
vercel domains add www.myapp.com my-application
```

### Redirect www to Non-www

```json
{
  "redirects": [
    {
      "source": "/:path(.*)",
      "has": [
        {
          "type": "host",
          "value": "www.myapp.com"
        }
      ],
      "destination": "https://myapp.com/:path",
      "permanent": true
    }
  ]
}
```

---

## Deployment Workflow

Implement a complete deployment workflow.

```mermaid
flowchart TD
    A[Developer Push] --> B[GitHub Webhook]
    B --> C[Vercel Build Triggered]
    C --> D{Branch Type?}
    D -->|main| E[Production Deploy]
    D -->|PR| F[Preview Deploy]
    D -->|staging| G[Staging Deploy]

    E --> H[Run Tests]
    F --> H
    G --> H

    H -->|Pass| I[Deploy to CDN]
    H -->|Fail| J[Build Failed]

    I --> K[Deployment Complete]
    K --> L[Notify Team]
```

### Vercel CLI Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy with specific environment
vercel --env NODE_ENV=production --env API_KEY=xxx

# Deploy to production and accept defaults in non-interactive environments
vercel --prod --yes

# View recent runtime logs
vercel logs

# Stream runtime logs for a specific deployment
vercel logs --follow --deployment dpl_xxxxx

# Rollback to previous deployment
vercel rollback [deployment-url]
```

---

## Monitoring and Analytics

Set up monitoring for your Vercel deployments.

### Vercel Analytics Integration

```typescript
// app/layout.tsx
// Add Vercel Analytics

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Monitoring Integration

```typescript
// lib/monitoring.ts
// Integrate with an external monitoring webhook

const monitoringWebhookUrl = process.env.MONITORING_WEBHOOK_URL!;

// Track deployments
export async function trackDeployment() {
  await fetch(monitoringWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "deployment",
      environment: process.env.VERCEL_ENV,
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
      timestamp: new Date().toISOString(),
    }),
  });
}

// Track errors
export async function trackError(error: Error) {
  await fetch(monitoringWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "error",
      message: error.message,
      stack: error.stack,
      region: process.env.VERCEL_REGION,
      url: process.env.VERCEL_URL,
    }),
  });
}
```

---

## Security Best Practices

Implement security measures for your Vercel deployment.

### Security Headers

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### Protecting Sensitive Routes

```typescript
// middleware.ts
// Protect admin routes

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    const authToken = request.cookies.get("admin-token");

    if (!authToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Rate limiting headers
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", "100");
  response.headers.set("X-RateLimit-Remaining", "99");

  return response;
}
```

---

## Conclusion

Vercel provides a powerful platform for deploying modern web applications. By properly configuring your deployment settings, you can ensure optimal performance, security, and reliability.

Key takeaways:

- Use `vercel.json` for detailed deployment configuration
- Manage environment variables securely across environments
- Configure functions with appropriate duration limits and plan-level memory settings
- Implement proper caching strategies for performance
- Use Edge Functions for geolocation and low-latency operations
- Set up preview deployments for pull request testing
- Implement security headers and best practices

With these configurations in place, your Vercel deployment will be production-ready and optimized for performance.

---

*Monitor your Vercel deployments with [OneUptime](https://oneuptime.com). Track uptime, performance metrics, and get alerted when issues occur across your deployed applications.*
