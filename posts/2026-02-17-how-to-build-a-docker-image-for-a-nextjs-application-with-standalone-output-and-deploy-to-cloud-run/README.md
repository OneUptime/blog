# How to Build a Docker Image for a Next.js Application with Standalone Output and Deploy to Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Next.js, Docker, Cloud Run, Node.js, Container, Serverless

Description: Learn how to build an optimized Docker image for a Next.js application using standalone output mode and deploy it to Google Cloud Run.

---

Next.js applications are notoriously large when containerized. A typical Next.js Docker image can easily be 1GB or more because it includes the entire `node_modules` directory, all your source files, and the full Next.js build output. That is a lot of wasted space when most of those files are not needed at runtime.

Next.js has a `standalone` output mode that solves this problem. When enabled, it produces a self-contained directory with only the files needed to run your application - the compiled pages, a minimal Node.js server, and only the node_modules that are actually imported. This drops the image size from over a gigabyte to around 100-200MB.

For Cloud Run, this means faster cold starts, cheaper storage, and quicker deployments.

## Enabling Standalone Output

First, configure your Next.js application to use standalone output. Edit your `next.config.js`.

```javascript
// next.config.js - Enable standalone output for Docker optimization
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // Useful for Cloud Run - trust the proxy headers
    poweredByHeader: false,
};

module.exports = nextConfig;
```

The `output: 'standalone'` setting tells Next.js to trace all the dependencies your application actually uses and create a minimal output directory.

## The Multi-Stage Dockerfile

Here is the Dockerfile that takes full advantage of standalone mode.

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static files - these are not included in standalone
COPY --from=builder /app/.next/static ./.next/static

# Copy public directory for static assets
COPY --from=builder /app/public ./public

# Set ownership to the non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

# Cloud Run uses the PORT environment variable
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# The standalone output includes a minimal server.js
CMD ["node", "server.js"]
```

Let me break down why this three-stage approach works well.

**Stage 1 (deps)**: Installs dependencies in an isolated stage. By copying only `package.json` and `package-lock.json` first, Docker caches this layer. Dependencies only get reinstalled when the lockfile changes.

**Stage 2 (builder)**: Builds the Next.js application. The `npm run build` command generates the standalone output in `.next/standalone`.

**Stage 3 (runner)**: The production image. It only contains the standalone server, static assets, and the public directory. Everything else - source code, devDependencies, build tools - is left behind in the builder stage.

## Understanding What Standalone Produces

After running `npm run build` with standalone mode, the `.next/standalone` directory contains:

- `server.js` - A minimal Node.js HTTP server
- `node_modules/` - Only the packages your app actually imports
- `.next/` - Compiled pages and chunks

What it does NOT include (and what we copy separately):

- `.next/static/` - CSS, JS chunks that are served as static files
- `public/` - Your static assets like images and favicons

That is why the Dockerfile has separate COPY instructions for the standalone output, static files, and public directory.

## Building and Pushing the Image

```bash
# Build the Docker image
docker build -t us-central1-docker.pkg.dev/my-project/my-repo/nextjs-app:v1 .

# Check the image size - should be around 150-200MB
docker images | grep nextjs-app

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/my-repo/nextjs-app:v1
```

## Deploying to Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy nextjs-app \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/nextjs-app:v1 \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --port=8080 \
    --set-env-vars="NODE_ENV=production"
```

## Handling Environment Variables

Next.js has two types of environment variables: build-time and runtime. This distinction matters for Docker.

Build-time variables (prefixed with `NEXT_PUBLIC_`) are baked into the JavaScript bundles during `npm run build`. They cannot be changed at runtime.

```dockerfile
# Pass build-time environment variables during the build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# These get baked into the client-side JavaScript
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build
```

Build with the argument.

```bash
# Pass the public API URL at build time
docker build \
    --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
    -t my-nextjs-app .
```

Runtime variables (server-side only) work normally through Cloud Run environment variables.

```bash
# Set runtime environment variables in Cloud Run
gcloud run deploy nextjs-app \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/nextjs-app:v1 \
    --set-env-vars="DATABASE_URL=postgres://...,API_SECRET=my-secret"
```

## Using Cloud Build for CI/CD

Here is a complete Cloud Build configuration.

```yaml
# cloudbuild.yaml - Build and deploy Next.js to Cloud Run
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'NEXT_PUBLIC_API_URL=https://api.${_DOMAIN}'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/nextjs-app:$SHORT_SHA'
      - '.'

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/nextjs-app:$SHORT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'nextjs-app'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/nextjs-app:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--port=8080'

substitutions:
  _DOMAIN: example.com
```

## Handling Static Asset Caching

For production, you want Cloud Run to serve static assets efficiently. Next.js sets long cache headers for assets in `_next/static/`, but you can also put a CDN in front.

```bash
# Set up Cloud CDN with a load balancer for static asset caching
gcloud compute backend-services create nextjs-backend \
    --global \
    --enable-cdn \
    --cache-mode=USE_ORIGIN_HEADERS

# Or use Cloud Run's built-in CDN integration
gcloud run services update nextjs-app \
    --region=us-central1 \
    --session-affinity
```

## Image Size Comparison

Here is how standalone output affects Docker image size for a typical Next.js application with several pages and a few dependencies:

- Without standalone (copying entire project): ~1.2GB
- With standalone mode: ~180MB
- With standalone + Alpine base: ~150MB

The size reduction comes from excluding unused node_modules. A typical Next.js project has hundreds of packages installed, but the application might only import a fraction of them.

## Wrapping Up

The combination of Next.js standalone output and a multi-stage Docker build produces surprisingly lean container images. For Cloud Run deployments, this translates directly to faster cold starts and lower costs. The three-stage Dockerfile pattern - deps, builder, runner - ensures clean layer caching and minimal final image size. Once you have this set up, deploying Next.js to Cloud Run is straightforward and efficient.
