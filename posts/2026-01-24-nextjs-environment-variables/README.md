# How to Configure Environment Variables in Next.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NextJS, Environment Variables, Configuration, DevOps, Security

Description: Learn how to properly configure and use environment variables in Next.js applications for both server-side and client-side code.

---

Environment variables are essential for configuring Next.js applications across different environments. However, Next.js handles environment variables differently than traditional Node.js applications. Understanding these differences is crucial for secure and effective configuration management.

## How Next.js Environment Variables Work

Next.js has a unique system for environment variables that separates server-side and client-side access:

```mermaid
flowchart TB
    subgraph "Environment Variables"
        A[".env.local"] --> B{Variable Name}
        B -->|"NEXT_PUBLIC_*"| C[Client + Server]
        B -->|"Regular vars"| D[Server Only]
    end

    subgraph "Runtime Access"
        C --> E["Browser JavaScript"]
        C --> F["Server Components"]
        D --> G["API Routes"]
        D --> H["getServerSideProps"]
        D --> I["Server Actions"]
    end
```

## Environment File Priority

Next.js loads environment files in a specific order, with later files taking precedence:

| File | Purpose | Loaded When |
|------|---------|-------------|
| `.env` | Default values | Always |
| `.env.local` | Local overrides | Always (except test) |
| `.env.development` | Development values | `next dev` |
| `.env.production` | Production values | `next build` |
| `.env.test` | Test values | `NODE_ENV=test` |

## Basic Configuration

Create a `.env.local` file in your project root:

```bash
# .env.local

# Server-only variables (not exposed to browser)
DATABASE_URL=postgresql://localhost:5432/myapp
API_SECRET_KEY=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_xxx

# Client-accessible variables (NEXT_PUBLIC_ prefix required)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ANALYTICS_ID=UA-123456789
NEXT_PUBLIC_FEATURE_FLAG=true
```

Create a `.env.example` file to document required variables:

```bash
# .env.example (commit this file)

# Required for database connection
DATABASE_URL=postgresql://user:password@host:5432/database

# API Keys
API_SECRET_KEY=your-secret-key
STRIPE_SECRET_KEY=sk_test_xxx

# Public variables
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## Accessing Environment Variables

### Server-Side Access

Environment variables are available in server-side code:

```typescript
// app/api/users/route.ts (App Router API Route)
import { NextResponse } from 'next/server';

export async function GET() {
  // Access server-only variables
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.API_SECRET_KEY;

  // These are available because this runs on the server
  console.log('Database URL:', databaseUrl);

  return NextResponse.json({ message: 'Success' });
}
```

```typescript
// app/page.tsx (Server Component)
export default async function HomePage() {
  // Server components can access all env vars
  const apiKey = process.env.API_SECRET_KEY;

  const data = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return <div>Home Page</div>;
}
```

### Client-Side Access

Only variables prefixed with `NEXT_PUBLIC_` are available in client code:

```typescript
// components/Analytics.tsx
'use client';

import { useEffect } from 'react';

export function Analytics() {
  useEffect(() => {
    // This works - NEXT_PUBLIC_ prefix
    const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;

    // This would be undefined - no NEXT_PUBLIC_ prefix
    // const secretKey = process.env.API_SECRET_KEY;

    if (analyticsId) {
      initializeAnalytics(analyticsId);
    }
  }, []);

  return null;
}

function initializeAnalytics(id: string) {
  console.log('Initializing analytics with ID:', id);
}
```

## Type-Safe Environment Variables

Create a configuration module with validation:

```typescript
// lib/env.ts
import { z } from 'zod';

// Define schema for server-side variables
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_SECRET_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Define schema for client-side variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_FEATURE_FLAG: z.string().transform(val => val === 'true').default('false'),
});

// Validate server environment
function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid server environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid server environment configuration');
  }

  return parsed.data;
}

// Validate client environment
function validateClientEnv() {
  const clientEnv = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    NEXT_PUBLIC_FEATURE_FLAG: process.env.NEXT_PUBLIC_FEATURE_FLAG,
  };

  const parsed = clientEnvSchema.safeParse(clientEnv);

  if (!parsed.success) {
    console.error('Invalid client environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid client environment configuration');
  }

  return parsed.data;
}

// Export validated environment
export const serverEnv = validateServerEnv();
export const clientEnv = validateClientEnv();
```

Usage:

```typescript
// In server components or API routes
import { serverEnv } from '@/lib/env';

const dbUrl = serverEnv.DATABASE_URL; // Type-safe string

// In client components
import { clientEnv } from '@/lib/env';

const apiUrl = clientEnv.NEXT_PUBLIC_API_URL; // Type-safe string
```

## Environment-Specific Configuration

```mermaid
flowchart LR
    subgraph "Development"
        A[".env.development"] --> B["next dev"]
    end

    subgraph "Production"
        C[".env.production"] --> D["next build"]
    end

    subgraph "Override Layer"
        E[".env.local"] --> B
        E --> D
    end

    B --> F["Development Server"]
    D --> G["Production Build"]
```

Example configuration files:

```bash
# .env.development
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEBUG=true
LOG_LEVEL=debug
```

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.production.com
NEXT_PUBLIC_DEBUG=false
LOG_LEVEL=error
```

## Runtime Environment Variables

For dynamic configuration that changes between deployments (not builds):

```typescript
// next.config.js
module.exports = {
  // These are available at runtime
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: process.env.MY_SECRET,
    databaseUrl: process.env.DATABASE_URL,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  },
};
```

Access runtime config:

```typescript
// Using runtime config
import getConfig from 'next/config';

const { serverRuntimeConfig, publicRuntimeConfig } = getConfig();

// Server-side only
console.log(serverRuntimeConfig.mySecret);

// Both server and client
console.log(publicRuntimeConfig.apiUrl);
```

## Docker and Container Deployments

Pass environment variables at runtime:

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build-time variables (baked into the build)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Runtime variables
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
```

Docker Compose example:

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build:
      context: .
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - API_SECRET_KEY=${API_SECRET_KEY}
    ports:
      - "3000:3000"
```

## Common Mistakes to Avoid

### Mistake 1: Exposing Secrets to Client

```typescript
// WRONG - This exposes your secret!
// components/BadExample.tsx
'use client';

export function BadExample() {
  // This will be undefined, but if it worked, it would be a security risk
  const secret = process.env.API_SECRET_KEY;
  return <div>{secret}</div>;
}
```

```typescript
// CORRECT - Use server-side data fetching
// app/page.tsx
export default async function Page() {
  // Fetch data on server using secret
  const data = await fetchWithSecret();

  // Only pass safe data to client
  return <ClientComponent data={data} />;
}

async function fetchWithSecret() {
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
    }
  });
  return response.json();
}
```

### Mistake 2: Not Restarting After Changes

Environment variables are loaded at build time for `NEXT_PUBLIC_` variables:

```bash
# After changing .env.local, restart the dev server
# Ctrl+C to stop, then:
npm run dev
```

### Mistake 3: Missing Variables in CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        env:
          # Build-time variables
          NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
        run: npm run build

      - name: Deploy
        env:
          # Runtime variables
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_SECRET_KEY: ${{ secrets.API_SECRET_KEY }}
        run: ./deploy.sh
```

## Environment Variable Checklist

| Task | Description |
|------|-------------|
| Use `NEXT_PUBLIC_` prefix | For client-accessible variables |
| Add `.env.local` to `.gitignore` | Never commit secrets |
| Create `.env.example` | Document required variables |
| Validate at startup | Fail fast on missing config |
| Use separate files per environment | `.env.development`, `.env.production` |
| Set variables in CI/CD | Both build-time and runtime |

## Debugging Environment Variables

```typescript
// pages/api/debug-env.ts (only in development!)
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  // List public env vars only
  const publicVars = Object.entries(process.env)
    .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  res.json({
    nodeEnv: process.env.NODE_ENV,
    publicVars,
    hasDatabase: !!process.env.DATABASE_URL,
    hasApiKey: !!process.env.API_SECRET_KEY,
  });
}
```

## Summary

Proper environment variable configuration in Next.js requires understanding the distinction between server-side and client-side variables. Always use the `NEXT_PUBLIC_` prefix for variables that need browser access, validate your configuration at startup, and never commit sensitive values to version control. Following these practices ensures secure and maintainable configuration across all your deployment environments.
