# How to Deploy a Next.js Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Next.js, React, SSR, JavaScript

Description: Deploy a Next.js application with server-side rendering to Kubernetes using Flux CD, including standalone output mode and environment variable injection.

---

## Introduction

Next.js applications differ from static React SPAs in an important way: they include a Node.js server that handles server-side rendering, API routes, and image optimization. This means you cannot simply serve the build output with Nginx — you need to run a Node.js process inside your container. Fortunately, Next.js's standalone output mode produces a self-contained server bundle that is easy to containerize efficiently.

Running Next.js on Kubernetes with Flux CD gives you the reliability of GitOps — every configuration change goes through Git, every rollback is a revert — plus the ability to scale the SSR server independently based on traffic. Flux continuously ensures your cluster matches your declared state, so deployments are consistent across environments.

This guide covers the Next.js standalone Docker build, Kubernetes manifest design, and the full Flux pipeline including automatic image updates.

## Prerequisites

- A Next.js 14+ application
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry accessible from the cluster
- `kubectl` and `flux` CLIs installed

## Step 1: Configure Next.js for Standalone Output

Add the `output: "standalone"` option to your Next.js configuration. This produces a `.next/standalone` directory containing only the files needed to run the server, dramatically reducing image size.

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Optionally disable the default X-Powered-By header
  poweredByHeader: false,
};

module.exports = nextConfig;
```

## Step 2: Write the Multi-Stage Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build the Next.js application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Pass build-time public env vars here if needed
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production runtime image — uses only the standalone output
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nextgroup && adduser -S nextuser -G nextgroup

# Copy the minimal standalone server
COPY --from=builder --chown=nextuser:nextgroup /app/.next/standalone ./
# Copy static assets and public directory
COPY --from=builder --chown=nextuser:nextgroup /app/.next/static ./.next/static
COPY --from=builder --chown=nextuser:nextgroup /app/public ./public

USER nextuser
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

```bash
docker build -t ghcr.io/your-org/my-nextjs-app:1.0.0 .
docker push ghcr.io/your-org/my-nextjs-app:1.0.0
```

## Step 3: Write the Kubernetes Manifests

```yaml
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nextjs-app
  namespace: my-nextjs-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-nextjs-app
  template:
    metadata:
      labels:
        app: my-nextjs-app
    spec:
      containers:
        - name: my-nextjs-app
          image: ghcr.io/your-org/my-nextjs-app:1.0.0  # {"$imagepolicy": "flux-system:my-nextjs-app"}
          ports:
            - containerPort: 3000
          env:
            - name: PORT
              value: "3000"
            # Runtime environment variables injected from a ConfigMap
            - name: NEXT_PUBLIC_API_URL
              valueFrom:
                configMapKeyRef:
                  name: nextjs-config
                  key: api_url
            # Sensitive values from Secrets
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: nextjs-secrets
                  key: database_url
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nextjs-config
  namespace: my-nextjs-app
data:
  api_url: "https://api.example.com"
---
# deploy/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-nextjs-app
  namespace: my-nextjs-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-nextjs-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 4: Configure Flux GitRepository and Kustomization

```yaml
# clusters/my-cluster/apps/my-nextjs-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-nextjs-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-nextjs-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-nextjs-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-nextjs-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-nextjs-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-nextjs-app
      namespace: my-nextjs-app
```

## Step 5: Set Up Image Automation

```yaml
# clusters/my-cluster/apps/my-nextjs-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-nextjs-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-nextjs-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-nextjs-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-nextjs-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-nextjs-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-nextjs-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update my-nextjs-app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 6: Verify the Deployment

```bash
# Check all Flux objects
flux get sources git my-nextjs-app
flux get kustomizations my-nextjs-app
flux get image repository my-nextjs-app

# Check the running pods
kubectl get pods -n my-nextjs-app

# Test the application
kubectl port-forward -n my-nextjs-app svc/my-nextjs-app 3000:3000
curl http://localhost:3000
```

## Best Practices

- Use Next.js `output: "standalone"` to minimize image size; the full `.next` build output is much larger than the standalone bundle.
- Implement a `/api/health` route that checks database connectivity and any critical dependencies for accurate liveness and readiness probes.
- For `NEXT_PUBLIC_*` variables (baked at build time), pass them as Docker build arguments in your CI pipeline; inject runtime-only variables via ConfigMaps and Secrets.
- Configure Horizontal Pod Autoscaler for SSR workloads since rendering is CPU-intensive during traffic spikes.
- Use `PodDisruptionBudget` to ensure at least one replica remains available during rolling updates.

## Conclusion

Deploying Next.js on Kubernetes with Flux CD gives you a production-ready SSR platform with full GitOps auditability. The standalone output mode keeps images lean, Kubernetes handles scaling and self-healing, and Flux ensures every cluster always reflects the state declared in your Git repository.
