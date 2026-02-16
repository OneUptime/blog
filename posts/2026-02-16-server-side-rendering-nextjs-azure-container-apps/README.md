# How to Implement Server-Side Rendering with Next.js on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Next.js, Azure, Container Apps, SSR, Docker, React, Server-Side Rendering

Description: Deploy a server-side rendered Next.js application to Azure Container Apps with Docker for scalable dynamic rendering.

---

Azure Static Web Apps works well for statically exported Next.js sites, but when you need true server-side rendering - dynamic pages that render on every request, API routes, middleware, and the full Next.js feature set - you need a server running your application. Azure Container Apps is a good fit for this. It runs containers with automatic scaling, built-in HTTPS, and a pay-per-use pricing model that keeps costs low during quiet periods.

This guide covers containerizing a Next.js application with server-side rendering and deploying it to Azure Container Apps.

## Why Container Apps for Next.js SSR

Azure Container Apps sits between Azure App Service and Azure Kubernetes Service in terms of complexity. You get container-based deployments without managing Kubernetes clusters. It supports scale-to-zero, which means you are not paying for idle containers. And it handles HTTPS termination, load balancing, and service discovery automatically.

For Next.js SSR, this means your dynamic pages render on the server for each request, giving you better SEO, faster initial page loads, and the ability to fetch data at request time.

## Prerequisites

- Node.js 18 or later
- Docker installed
- Azure CLI with the containerapp extension
- Azure account
- Basic Next.js and Docker knowledge

## Creating the Next.js Application

```bash
# Create a new Next.js app with the App Router
npx create-next-app@latest nextjs-ssr-demo --typescript --app --src-dir
cd nextjs-ssr-demo
```

Build a page that demonstrates server-side rendering:

```typescript
// src/app/page.tsx - Home page with server-side data fetching
interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  fetchedAt: string;
}

// This runs on the server for every request
async function getWeather(): Promise<WeatherData> {
  // Simulate fetching from a weather API
  // In production, call an actual API here
  return {
    location: 'New York',
    temperature: Math.round(15 + Math.random() * 20),
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Windy'][Math.floor(Math.random() * 4)],
    humidity: Math.round(40 + Math.random() * 40),
    fetchedAt: new Date().toISOString(),
  };
}

export default async function Home() {
  // This data is fetched on every request, not cached
  const weather = await getWeather();

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Weather Dashboard (SSR)</h1>

      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-semibold">{weather.location}</h2>
        <p className="text-5xl font-bold my-4">{weather.temperature}C</p>
        <p className="text-lg">{weather.condition}</p>
        <p className="text-sm text-gray-500">Humidity: {weather.humidity}%</p>
        <p className="text-xs text-gray-400 mt-4">
          Rendered at: {weather.fetchedAt}
        </p>
        <p className="text-xs text-gray-400">
          Refresh to see a new timestamp (proves SSR)
        </p>
      </div>
    </main>
  );
}

// Force dynamic rendering - no static optimization
export const dynamic = 'force-dynamic';
```

Add a dynamic route with route parameters:

```typescript
// src/app/products/[id]/page.tsx - Dynamic product page
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

// Simulated product data
const products: Record<string, Product> = {
  '1': { id: '1', name: 'Widget Pro', price: 29.99, description: 'A professional-grade widget for serious work.' },
  '2': { id: '2', name: 'Gadget Plus', price: 49.99, description: 'The enhanced gadget with extra features.' },
  '3': { id: '3', name: 'Tool Master', price: 79.99, description: 'The ultimate tool for any job.' },
};

// Server-side data fetching for each product page
async function getProduct(id: string): Promise<Product | null> {
  // Simulate API call or database query
  return products[id] || null;
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    return (
      <main className="p-8">
        <h1 className="text-2xl">Product not found</h1>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-2xl text-green-600 my-4">${product.price}</p>
      <p className="text-gray-700">{product.description}</p>
    </main>
  );
}

export const dynamic = 'force-dynamic';
```

Add a Next.js API route:

```typescript
// src/app/api/health/route.ts - Health check endpoint
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}
```

## Creating the Dockerfile

Create a multi-stage Dockerfile optimized for production:

```dockerfile
# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 3: Production runtime
FROM node:18-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Start the Next.js server
CMD ["node", "server.js"]
```

Update `next.config.js` to enable standalone output:

```javascript
// next.config.js - Enable standalone output for Docker
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Optimize for container environments
  experimental: {
    // Reduce memory usage in containers
  },
};

module.exports = nextConfig;
```

Test the Docker build locally:

```bash
# Build the Docker image
docker build -t nextjs-ssr-demo .

# Run locally to verify it works
docker run -p 3000:3000 nextjs-ssr-demo
```

## Deploying to Azure Container Apps

Set up the Azure resources:

```bash
# Install the container apps extension
az extension add --name containerapp --upgrade

# Create a resource group
az group create --name nextjs-ssr-rg --location eastus

# Create a Container Apps environment
az containerapp env create \
  --name nextjs-ssr-env \
  --resource-group nextjs-ssr-rg \
  --location eastus

# Create an Azure Container Registry
az acr create \
  --name nextjssrracr \
  --resource-group nextjs-ssr-rg \
  --sku Basic \
  --admin-enabled true
```

Push the Docker image to ACR:

```bash
# Log in to the container registry
az acr login --name nextjssrracr

# Tag and push the image
docker tag nextjs-ssr-demo nextjssrracr.azurecr.io/nextjs-ssr-demo:latest
docker push nextjssrracr.azurecr.io/nextjs-ssr-demo:latest
```

Create the Container App:

```bash
# Get ACR credentials
ACR_PASSWORD=$(az acr credential show --name nextjssrracr --query "passwords[0].value" --output tsv)

# Create the Container App
az containerapp create \
  --name nextjs-ssr-app \
  --resource-group nextjs-ssr-rg \
  --environment nextjs-ssr-env \
  --image nextjssrracr.azurecr.io/nextjs-ssr-demo:latest \
  --registry-server nextjssrracr.azurecr.io \
  --registry-username nextjssrracr \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars NODE_ENV=production
```

The `--min-replicas 0` enables scale-to-zero. The `--max-replicas 10` sets the upper scaling limit.

## Configuring Scaling Rules

Set up HTTP-based scaling so the app scales with traffic:

```bash
# Add a scaling rule based on concurrent HTTP requests
az containerapp update \
  --name nextjs-ssr-app \
  --resource-group nextjs-ssr-rg \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

This tells Container Apps to add a new replica when an existing one handles more than 50 concurrent requests.

## CI/CD with GitHub Actions

Automate deployments with a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure Container Apps

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        run: az acr login --name nextjssrracr

      - name: Build and push image
        run: |
          docker build -t nextjssrracr.azurecr.io/nextjs-ssr-demo:${{ github.sha }} .
          docker push nextjssrracr.azurecr.io/nextjs-ssr-demo:${{ github.sha }}

      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name nextjs-ssr-app \
            --resource-group nextjs-ssr-rg \
            --image nextjssrracr.azurecr.io/nextjs-ssr-demo:${{ github.sha }}
```

## Wrapping Up

Azure Container Apps is a solid platform for Next.js applications that need server-side rendering. The standalone output mode keeps the Docker image small, the multi-stage build separates build dependencies from runtime, and Container Apps handles scaling automatically. Scale-to-zero keeps costs down during off-peak hours, and the HTTP-based scaling rules ensure your application handles traffic spikes without manual intervention. For Next.js applications that go beyond static export - using middleware, server components with dynamic data, or API routes - this deployment approach gives you the full framework capabilities in a managed, scalable environment.
