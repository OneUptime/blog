# How to Optimize Docker Image Size for a NestJS Application Using Multi-Stage Builds and Alpine Base Images for GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, NestJS, Docker, GKE, Node.js, Alpine, Container Optimization

Description: Learn how to dramatically reduce Docker image size for NestJS applications using multi-stage builds and Alpine base images for faster GKE deployments.

---

NestJS applications, like most Node.js projects, can produce enormous Docker images. A naive Dockerfile that copies the entire project directory, including `node_modules`, TypeScript source, test files, and dev dependencies, can easily produce an image that is 1GB or more. That is a problem on GKE where every node needs to pull the image, and larger images mean slower deployments and higher storage costs.

With multi-stage builds and Alpine base images, you can get a NestJS production image down to 150-200MB. The approach is straightforward: use one stage for building and another for running, and only copy what the application actually needs at runtime.

## The Problem with Naive Docker Builds

Here is what a typical bad Dockerfile looks like.

```dockerfile
# Bad example - do not use this in production
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["node", "dist/main.js"]
```

This image includes:
- The full Node.js image with npm, yarn, and build tools (~350MB)
- All `node_modules` including devDependencies (~300MB for a typical NestJS app)
- TypeScript source files (not needed at runtime)
- Test files, documentation, configs
- npm cache

Total: easily 800MB-1.2GB.

## The Optimized Multi-Stage Dockerfile

Here is the optimized version.

```dockerfile
# Stage 1: Install all dependencies and build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for dependency caching
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies (needed for TypeScript compilation)
RUN npm ci

# Copy source code and configuration
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Build the NestJS application
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Stage 2: Production runtime
FROM node:20-alpine AS runner

# Install security updates
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what we need from the builder
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the application
CMD ["node", "dist/main.js"]
```

The key optimizations:

1. **Alpine base**: `node:20-alpine` is ~50MB versus ~350MB for `node:20`
2. **Multi-stage build**: Build tools and TypeScript compiler stay in the builder stage
3. **npm prune**: Removes devDependencies after building, keeping only production packages
4. **Selective COPY**: Only `dist/`, `node_modules/`, and `package.json` go into the final image
5. **Non-root user**: Better security without adding image size

## A Sample NestJS Application

Here is a simple NestJS service to demonstrate.

```typescript
// src/main.ts - NestJS application entry point
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable graceful shutdown for Kubernetes
    app.enableShutdownHooks();

    const port = process.env.PORT || 8080;
    await app.listen(port, '0.0.0.0');
    console.log(`Application running on port ${port}`);
}
bootstrap();
```

```typescript
// src/app.module.ts - Root module
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { HealthController } from './health.controller';

@Module({
    controllers: [AppController, HealthController],
})
export class AppModule {}
```

```typescript
// src/app.controller.ts - Main API controller
import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
    @Get('info')
    getInfo() {
        return {
            service: 'nestjs-optimized',
            version: process.env.npm_package_version || '1.0.0',
            nodeEnv: process.env.NODE_ENV,
        };
    }
}
```

```typescript
// src/health.controller.ts - Health check for Kubernetes
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    check() {
        return { status: 'ok' };
    }
}
```

## Further Size Reduction with .dockerignore

A proper `.dockerignore` file prevents unnecessary files from entering the build context.

```text
# .dockerignore - Exclude everything not needed for the build
node_modules
dist
.git
.github
*.md
.env*
.vscode
coverage
test
*.spec.ts
docker-compose*.yml
.eslintrc*
.prettierrc*
jest.config.*
```

## Building and Deploying to GKE

Build the image and push to Artifact Registry.

```bash
# Build the optimized image
docker build -t us-central1-docker.pkg.dev/my-project/my-repo/nestjs-app:v1 .

# Check the size
docker images | grep nestjs-app
# Should be around 150-200MB

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/my-repo/nestjs-app:v1
```

Deploy to GKE.

```yaml
# k8s/deployment.yaml - GKE deployment for NestJS
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestjs-app
  template:
    metadata:
      labels:
        app: nestjs-app
    spec:
      containers:
        - name: nestjs-app
          image: us-central1-docker.pkg.dev/my-project/my-repo/nestjs-app:v1
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          # Health checks using the health endpoint
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "8080"
---
apiVersion: v1
kind: Service
metadata:
  name: nestjs-app
spec:
  type: ClusterIP
  selector:
    app: nestjs-app
  ports:
    - port: 80
      targetPort: 8080
```

## Going Even Smaller with Node Prune

`node-prune` removes unnecessary files from `node_modules` like README files, changelogs, and TypeScript source maps.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

# Install node-prune
RUN wget -qO- https://gobinaries.com/tj/node-prune | sh

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Remove unnecessary files from node_modules
RUN node-prune

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
USER appuser
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "dist/main.js"]
```

This can shave another 20-30MB off the image.

## Size Comparison

Here is a size comparison for a NestJS application with common dependencies (TypeORM, class-validator, passport):

| Approach | Image Size |
|----------|-----------|
| node:20, no multi-stage | ~1.1GB |
| node:20-slim, no multi-stage | ~450MB |
| node:20-alpine, no multi-stage | ~350MB |
| node:20-alpine, multi-stage | ~180MB |
| node:20-alpine, multi-stage + prune | ~150MB |

## Cloud Build Configuration

```yaml
# cloudbuild.yaml - Build and push optimized NestJS image
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/nestjs-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/nestjs-app:latest'
      - '.'
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/nestjs-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/nestjs-app:latest'
```

## Wrapping Up

Optimizing NestJS Docker images for GKE is primarily about being deliberate with what goes into the final image. Multi-stage builds let you separate the build environment from the runtime, Alpine base images cut the OS footprint, and npm prune removes unnecessary packages. The result is an image that is 5-7 times smaller than a naive build, which translates to faster deployments, quicker scaling, and lower costs on GKE.
