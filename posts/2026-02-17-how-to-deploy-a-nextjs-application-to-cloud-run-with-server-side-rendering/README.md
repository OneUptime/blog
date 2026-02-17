# How to Deploy a Next.js Application to Cloud Run with Server-Side Rendering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Next.js, Server-Side Rendering, Google Cloud, Node.js

Description: Learn how to deploy a Next.js application with server-side rendering to Google Cloud Run, including Docker configuration and production optimization.

---

Next.js is one of the most popular React frameworks, and for good reason. Its server-side rendering (SSR), static site generation, and API routes make it a solid choice for production applications. Cloud Run is a natural fit for hosting Next.js because it handles the container orchestration and auto-scaling while you focus on writing code.

This guide covers everything from creating a production-ready Dockerfile to deploying and optimizing your Next.js app on Cloud Run.

## Why Cloud Run for Next.js

You might wonder why not just deploy a static export to Cloud Storage or Firebase Hosting. The answer is SSR. If you need server-side rendering, API routes, or middleware, you need a server running Node.js. Cloud Run gives you that server without the overhead of managing VMs or Kubernetes.

Cloud Run benefits for Next.js:

- Scales to zero when there is no traffic (pay nothing when idle)
- Scales up automatically during traffic spikes
- Handles HTTPS and custom domains out of the box
- Supports WebSockets and streaming SSR
- No infrastructure to manage

## Step 1: Prepare Your Next.js Application

Make sure your Next.js app is configured for standalone output, which is what you want for containerized deployments. Open your `next.config.js`:

```javascript
// next.config.js - Configure Next.js for standalone container output
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Optional: configure image optimization
  images: {
    // Use the built-in image optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
```

The `output: "standalone"` setting tells Next.js to create a self-contained build that includes all necessary dependencies. This makes the Docker image much smaller because you do not need to copy the entire `node_modules` directory.

## Step 2: Create the Dockerfile

This Dockerfile uses a multi-stage build to keep the final image lean:

```dockerfile
# Dockerfile for Next.js with standalone output
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for the build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Cloud Run sets the PORT environment variable
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
```

A few important details here. The multi-stage build means the final image only contains the standalone output, not the build tools or source code. Running as a non-root user is a security best practice. The `PORT` environment variable is set to 8080 because Cloud Run expects that, though Cloud Run will override it with its own PORT variable.

## Step 3: Add a .dockerignore File

Keep the build context clean:

```text
# .dockerignore - Exclude unnecessary files from Docker build
node_modules
.next
.git
.gitignore
*.md
.env*
.vscode
.idea
```

## Step 4: Test Locally

Build and run the container locally to make sure everything works:

```bash
# Build the Docker image locally
docker build -t nextjs-app .

# Run it locally on port 8080
docker run -p 8080:8080 -e PORT=8080 nextjs-app
```

Open `http://localhost:8080` in your browser and verify SSR is working by viewing the page source. You should see fully rendered HTML, not an empty div waiting for JavaScript to hydrate.

## Step 5: Push to Artifact Registry

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create web-apps \
  --repository-format=docker \
  --location=us-central1

# Build and push using Cloud Build (faster than local push)
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$(gcloud config get-value project)/web-apps/nextjs-app:latest
```

## Step 6: Deploy to Cloud Run

```bash
# Deploy the Next.js app to Cloud Run
gcloud run deploy nextjs-app \
  --image=us-central1-docker.pkg.dev/$(gcloud config get-value project)/web-apps/nextjs-app:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80
```

Cloud Run will give you a URL like `https://nextjs-app-xxxxx-uc.a.run.app`. Your Next.js app is now live with SSR.

## Step 7: Configure Environment Variables

Next.js uses environment variables for configuration. Pass them during deployment:

```bash
# Deploy with environment variables
gcloud run deploy nextjs-app \
  --image=us-central1-docker.pkg.dev/$(gcloud config get-value project)/web-apps/nextjs-app:latest \
  --region=us-central1 \
  --set-env-vars="DATABASE_URL=postgresql://...,API_KEY=your-api-key,NEXT_PUBLIC_SITE_URL=https://your-domain.com"
```

For sensitive values, use Secret Manager:

```bash
# Create a secret
echo -n "your-secret-value" | gcloud secrets create api-key --data-file=-

# Reference it in Cloud Run
gcloud run deploy nextjs-app \
  --image=us-central1-docker.pkg.dev/$(gcloud config get-value project)/web-apps/nextjs-app:latest \
  --region=us-central1 \
  --set-secrets="API_KEY=api-key:latest"
```

Remember that `NEXT_PUBLIC_` variables are embedded at build time, not runtime. If you need public environment variables to change per deployment, you need to rebuild the image or use a runtime configuration approach.

## Performance Optimization

### Cold Start Reduction

Next.js cold starts on Cloud Run can be slow if the app is large. Here are ways to reduce them:

```bash
# Keep one instance always warm to eliminate cold starts for the first user
gcloud run services update nextjs-app \
  --region=us-central1 \
  --min-instances=1 \
  --cpu-always-allocated
```

### Caching Headers

Set proper cache headers in your Next.js app to leverage Cloud CDN or browser caching:

```javascript
// pages/api/data.js - API route with cache headers
export default function handler(req, res) {
  // Cache the response for 60 seconds at the CDN level
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.json({ data: "your data here" });
}
```

### Image Optimization

Next.js Image Optimization works on Cloud Run but can be CPU-intensive. For high-traffic sites, consider using an external image CDN:

```javascript
// next.config.js - Use an external image loader for better performance
const nextConfig = {
  output: "standalone",
  images: {
    loader: "custom",
    loaderFile: "./image-loader.js",
  },
};
```

## Custom Domain Setup

Map a custom domain to your Cloud Run service:

```bash
# Map a custom domain
gcloud run domain-mappings create \
  --service=nextjs-app \
  --domain=app.yourdomain.com \
  --region=us-central1
```

Follow the DNS verification instructions that the command outputs. You will need to add a CNAME record pointing to `ghs.googlehosted.com`.

## Continuous Deployment

Set up automatic deployments from your Git repository:

```yaml
# cloudbuild.yaml for Next.js continuous deployment
steps:
  # Build the Docker image
  - name: "gcr.io/cloud-builders/docker"
    args:
      - "build"
      - "-t"
      - "us-central1-docker.pkg.dev/$PROJECT_ID/web-apps/nextjs-app:$COMMIT_SHA"
      - "."

  # Push to Artifact Registry
  - name: "gcr.io/cloud-builders/docker"
    args: ["push", "us-central1-docker.pkg.dev/$PROJECT_ID/web-apps/nextjs-app:$COMMIT_SHA"]

  # Deploy to Cloud Run
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    entrypoint: gcloud
    args:
      - "run"
      - "deploy"
      - "nextjs-app"
      - "--image=us-central1-docker.pkg.dev/$PROJECT_ID/web-apps/nextjs-app:$COMMIT_SHA"
      - "--region=us-central1"
      - "--platform=managed"
```

## Summary

Deploying Next.js to Cloud Run with SSR is straightforward once you have the Dockerfile right. Use the standalone output mode, multi-stage builds, and run as a non-root user. For production, keep at least one warm instance to avoid cold starts, use Secret Manager for sensitive config, and set up continuous deployment so your team can ship without manual steps. Cloud Run handles the scaling and infrastructure, and you get SSR without managing servers.
