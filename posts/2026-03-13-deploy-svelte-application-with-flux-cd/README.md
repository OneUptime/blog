# How to Deploy a Svelte Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Svelte, SvelteKit, JavaScript, Nginx

Description: Deploy a Svelte or SvelteKit application to Kubernetes using Flux CD, covering both static export and SSR adapter configurations.

---

## Introduction

Svelte takes a different approach from React and Vue: instead of shipping a framework runtime to the browser, it compiles components into highly optimized vanilla JavaScript at build time. The result is smaller bundle sizes and faster page loads. SvelteKit, the full-stack meta-framework built on Svelte, supports multiple output modes: static site generation (SSG), server-side rendering (SSR) with a Node.js adapter, and single-page app mode.

This guide covers two deployment patterns with Flux CD: the fully static export (serving with Nginx, ideal for SPAs and SSG) and the Node.js SSR adapter (running SvelteKit as a Node.js server). Both approaches use the same Flux GitOps pipeline structure.

## Prerequisites

- A Svelte or SvelteKit application
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs installed

## Step 1: Choose Your SvelteKit Adapter

```javascript
// svelte.config.js — Option A: static adapter for Nginx serving
import adapter from "@sveltejs/adapter-static";

export default {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "index.html",  // SPA fallback for client-side routing
    }),
  },
};
```

```javascript
// svelte.config.js — Option B: Node.js adapter for SSR
import adapter from "@sveltejs/adapter-node";

export default {
  kit: {
    adapter: adapter({
      out: "build",
    }),
  },
};
```

## Step 2: Containerize the Svelte Application

### Option A: Static Output with Nginx

```dockerfile
# Dockerfile.static — Nginx serving static SvelteKit output
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # Output in ./build

FROM nginx:1.27-alpine AS runner
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    location ~* \.(js|css|png|jpg|svg|woff2|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback for SvelteKit client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Option B: Node.js Adapter for SSR

```dockerfile
# Dockerfile.ssr — SvelteKit with Node.js adapter
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build   # Output in ./build (contains server.js)

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S svelte && adduser -S svelte -G svelte
COPY --from=builder --chown=svelte:svelte /app/build ./build
COPY --from=builder --chown=svelte:svelte /app/package*.json ./
RUN npm ci --only=production
USER svelte
EXPOSE 3000
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
CMD ["node", "build/index.js"]
```

```bash
# Build and push (using Option B / SSR as example)
docker build -f Dockerfile.ssr -t ghcr.io/your-org/my-svelte-app:1.0.0 .
docker push ghcr.io/your-org/my-svelte-app:1.0.0
```

## Step 3: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-svelte-app
---
# deploy/configmap.yaml — runtime configuration for the SvelteKit app
apiVersion: v1
kind: ConfigMap
metadata:
  name: svelte-config
  namespace: my-svelte-app
data:
  # For SSR adapter: environment variables
  PUBLIC_API_BASE_URL: "https://api.example.com"
  BODY_SIZE_LIMIT: "1048576"
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-svelte-app
  namespace: my-svelte-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-svelte-app
  template:
    metadata:
      labels:
        app: my-svelte-app
    spec:
      containers:
        - name: my-svelte-app
          image: ghcr.io/your-org/my-svelte-app:1.0.0  # {"$imagepolicy": "flux-system:my-svelte-app"}
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: svelte-config
          env:
            - name: HOST
              value: "0.0.0.0"
            - name: PORT
              value: "3000"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-svelte-app
  namespace: my-svelte-app
spec:
  selector:
    app: my-svelte-app
  ports:
    - name: http
      port: 80
      targetPort: 3000
---
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-svelte-app
  namespace: my-svelte-app
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-svelte-app
                port:
                  number: 80
```

## Step 4: Configure Flux GitRepository and Kustomization

```yaml
# clusters/my-cluster/apps/my-svelte-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-svelte-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-svelte-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-svelte-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-svelte-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-svelte-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-svelte-app
      namespace: my-svelte-app
```

## Step 5: Configure Image Automation

```yaml
# clusters/my-cluster/apps/my-svelte-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-svelte-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-svelte-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-svelte-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-svelte-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-svelte-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-svelte-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update svelte app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 6: Verify the Deployment

```bash
flux get kustomizations my-svelte-app
kubectl get pods -n my-svelte-app

kubectl port-forward -n my-svelte-app svc/my-svelte-app 8080:80
# Open http://localhost:8080 to verify the SvelteKit app loads
```

## Best Practices

- For public-facing `PUBLIC_*` environment variables in SvelteKit SSR, pass them as environment variables to the Node.js process rather than baking them into the build — the Node adapter reads them at runtime.
- Use the `adapter-static` for pure content sites (documentation, marketing pages) and `adapter-node` for applications that need server-side logic, API routes, or per-request personalization.
- Implement a `/api/health` server route in SvelteKit SSR for a meaningful liveness probe that checks database or backend API connectivity.
- Use `npm ci` with a lockfile and pin the Node.js version in the Dockerfile to ensure reproducible builds.
- Configure Nginx with `gzip_static on` and pre-compress assets during the build phase for faster serving without runtime CPU overhead.

## Conclusion

Svelte and SvelteKit fit naturally into a Kubernetes and Flux CD GitOps workflow. The static adapter produces tiny, fast-loading bundles served efficiently by Nginx, while the Node.js adapter enables full SSR capabilities. Flux CD ensures every environment runs the exact version declared in Git, with automated image updates closing the loop between your CI pipeline and production.
