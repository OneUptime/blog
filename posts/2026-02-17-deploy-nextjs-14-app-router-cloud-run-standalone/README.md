# How to Deploy a Next.js 14 App Router Application to Cloud Run with Standalone Output Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Next.js, Docker, Deployment, Google Cloud

Description: Step-by-step guide to deploying a Next.js 14 App Router application to Google Cloud Run using standalone output mode for optimized Docker images.

---

Next.js 14 introduced a mature App Router that many teams are now adopting in production. When it comes to deploying these applications on Google Cloud, Cloud Run is an excellent choice - it gives you serverless scaling, pay-per-use pricing, and custom domain support. But the default Next.js build output is not optimized for containers. The standalone output mode solves this by producing a self-contained build that includes only the files needed to run in production, resulting in much smaller Docker images.

In this post, I will walk through the entire process of configuring a Next.js 14 App Router application for standalone mode and deploying it to Cloud Run.

## Configuring Standalone Output

First, update your `next.config.js` to enable standalone output.

```javascript
// next.config.js - Enable standalone output for optimized builds
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable image optimization if not using a CDN
  // Cloud Run does not have persistent storage for cached images
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
```

When you run `next build` with this configuration, Next.js creates a `.next/standalone` directory that contains a minimal Node.js server and only the dependencies your application actually uses. This can reduce your final image size by 80% or more compared to copying your entire `node_modules` directory.

## Understanding the Standalone Output Structure

After building, the standalone directory contains:

- `server.js` - A minimal Node.js HTTP server
- `node_modules/` - Only the production dependencies actually imported by your code
- `.next/` - The compiled application

However, the standalone build does not include the `public/` directory or `.next/static/` directory. You need to copy these yourself in your Dockerfile.

## Writing the Dockerfile

Here is a multi-stage Dockerfile optimized for Next.js 14 on Cloud Run.

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all source files
COPY . .
# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Build the Next.js application in standalone mode
RUN npm run build

# Stage 3: Production image - only what we need to run
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
# Cloud Run sets PORT automatically, default to 8080
ENV PORT=8080
# Disable Next.js telemetry in production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/.next/standalone ./
# Copy static files that standalone mode does not include
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory for static assets
COPY --from=builder /app/public ./public

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose the port Cloud Run will use
EXPOSE 8080

# Start the standalone server
# HOSTNAME must be 0.0.0.0 for Cloud Run to route traffic correctly
CMD ["node", "server.js"]
```

The key detail for Cloud Run is the `HOSTNAME` binding. Cloud Run routes traffic to your container on `0.0.0.0`, not `localhost`. Next.js standalone mode reads the `HOSTNAME` and `PORT` environment variables.

## Setting the Hostname

Cloud Run requires your application to listen on `0.0.0.0`. You can set this in a `.env.production` file or directly in the Dockerfile.

```dockerfile
# Add this to your Dockerfile's runner stage
ENV HOSTNAME=0.0.0.0
```

Or set it in your `.env.production` file.

```
HOSTNAME=0.0.0.0
PORT=8080
```

## Adding a .dockerignore File

Keep your Docker build context small with a proper `.dockerignore`.

```
# .dockerignore - Exclude files not needed in the build
node_modules
.next
.git
.gitignore
*.md
.env.local
.env.development
docker-compose*.yml
.dockerignore
Dockerfile
```

## Building and Testing Locally

Before deploying, build and test the Docker image locally.

```bash
# Build the Docker image
docker build -t nextjs-app .

# Run it locally, simulating Cloud Run's PORT environment variable
docker run -p 8080:8080 -e PORT=8080 -e HOSTNAME=0.0.0.0 nextjs-app
```

Visit `http://localhost:8080` to verify everything works.

## Deploying to Cloud Run

You can deploy directly from source using `gcloud run deploy`, which builds the container in Cloud Build and deploys it in one command.

```bash
# Deploy from source - Cloud Build handles the Docker build
gcloud run deploy nextjs-app \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "HOSTNAME=0.0.0.0,NODE_ENV=production"
```

Alternatively, build and push the image to Artifact Registry first.

```bash
# Create an Artifact Registry repository (one-time setup)
gcloud artifacts repositories create nextjs-repo \
  --repository-format=docker \
  --location=us-central1

# Build and push the image
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/your-project/nextjs-repo/nextjs-app:latest

# Deploy from the built image
gcloud run deploy nextjs-app \
  --image us-central1-docker.pkg.dev/your-project/nextjs-repo/nextjs-app:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "HOSTNAME=0.0.0.0"
```

## Handling Environment Variables

For App Router applications, there are two categories of environment variables:

1. Build-time variables (prefixed with `NEXT_PUBLIC_`) - baked into the client bundle
2. Runtime variables - available only on the server

```bash
# Set runtime environment variables on Cloud Run
gcloud run services update nextjs-app \
  --set-env-vars "DATABASE_URL=your-db-url,API_KEY=your-api-key" \
  --region us-central1

# For build-time variables, pass them as build args
# in your Dockerfile or Cloud Build config
```

For build-time `NEXT_PUBLIC_` variables, add build args to your Dockerfile.

```dockerfile
# In the builder stage, accept build arguments
FROM node:20-alpine AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build
```

## Configuring Cloud Run for Next.js

A few Cloud Run settings are worth tuning for Next.js applications.

```bash
# Configure concurrency and startup
gcloud run services update nextjs-app \
  --region us-central1 \
  --concurrency 80 \
  --cpu-boost \
  --startup-cpu-boost \
  --min-instances 1 \
  --timeout 60
```

The `--cpu-boost` flag temporarily allocates extra CPU during startup, which helps with Next.js cold starts. Setting `--min-instances 1` keeps at least one instance warm, eliminating cold starts for consistent traffic patterns.

## Setting Up a Cloud Build Trigger

For continuous deployment, set up a Cloud Build trigger.

```yaml
# cloudbuild.yaml - Build and deploy on every push
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/nextjs-repo/nextjs-app:$COMMIT_SHA'
      - '.'

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/nextjs-repo/nextjs-app:$COMMIT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'nextjs-app'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/nextjs-repo/nextjs-app:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/nextjs-repo/nextjs-app:$COMMIT_SHA'
```

## Verifying the Deployment

After deployment, verify your application is running correctly.

```bash
# Get the service URL
gcloud run services describe nextjs-app --region us-central1 --format='value(status.url)'

# Test the application
curl -I https://nextjs-app-xxxxx-uc.a.run.app
```

Deploying Next.js 14 App Router applications to Cloud Run with standalone output mode gives you fast cold starts, small container images, and the full power of serverless scaling. The standalone build strips away everything your application does not need, and Cloud Run handles the rest - scaling, HTTPS, and load balancing are all managed for you.
