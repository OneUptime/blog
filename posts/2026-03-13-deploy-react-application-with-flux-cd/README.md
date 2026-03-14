# How to Deploy a React Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, React, JavaScript, SPA, Nginx

Description: Deploy a React single-page application to Kubernetes using Flux CD and Nginx, with automated image updates and environment-specific configuration.

---

## Introduction

React single-page applications are typically built into a set of static files — HTML, JavaScript, and CSS bundles — that can be served by any web server. On Kubernetes, Nginx is the standard choice: it is lightweight, highly configurable, and handles the client-side routing that SPAs require. The challenge is wiring together the build pipeline, container image registry, and Kubernetes deployment in a way that is repeatable and auditable.

Flux CD makes this straightforward. You define your Nginx-wrapped React app as a container image, write the Kubernetes manifests once, and let Flux continuously reconcile the cluster against your Git repository. When your CI pipeline pushes a new image tag, Flux's image automation controller detects it and opens or pushes a commit updating the deployment — no human intervention required.

This guide covers building a React app into an Nginx container, writing the Kubernetes manifests, and setting up the full Flux GitOps pipeline including automatic image promotion.

## Prerequisites

- A React application (created with Vite, Create React App, or similar)
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry (GHCR, Docker Hub, ECR, or GCR)
- `kubectl` and `flux` CLIs installed and configured

## Step 1: Build the React Application Container Image

```dockerfile
# Dockerfile — two-stage build: build React, serve with Nginx
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the production bundle; output goes to /app/dist (Vite) or /app/build (CRA)
RUN npm run build

FROM nginx:1.27-alpine AS runner
# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom Nginx config that handles SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built React app
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf — handles React Router's client-side routing
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Serve static assets with long-lived caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fallback to index.html for client-side routing (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
docker build -t ghcr.io/your-org/my-react-app:1.0.0 .
docker push ghcr.io/your-org/my-react-app:1.0.0
```

## Step 2: Write the Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-react-app
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-react-app
  namespace: my-react-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-react-app
  template:
    metadata:
      labels:
        app: my-react-app
    spec:
      containers:
        - name: my-react-app
          image: ghcr.io/your-org/my-react-app:1.0.0  # {"$imagepolicy": "flux-system:my-react-app"}
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "200m"
              memory: "128Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-react-app
  namespace: my-react-app
spec:
  selector:
    app: my-react-app
  ports:
    - port: 80
      targetPort: 80
---
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-react-app
  namespace: my-react-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
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
                name: my-react-app
                port:
                  number: 80
```

## Step 3: Define the Flux Source and Kustomization

```yaml
# clusters/my-cluster/apps/my-react-app/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-react-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-react-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-react-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-react-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-react-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-react-app
      namespace: my-react-app
```

## Step 4: Configure Automatic Image Updates

```yaml
# clusters/my-cluster/apps/my-react-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-react-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-react-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-react-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-react-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-react-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-react-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update my-react-app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 5: Inject Runtime Configuration

React apps bake environment variables at build time. For runtime configuration (API base URLs that differ per environment), use a ConfigMap served as a JavaScript file.

```yaml
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: runtime-config
  namespace: my-react-app
data:
  # This file is served by Nginx and loaded before React initializes
  config.js: |
    window.APP_CONFIG = {
      apiBaseUrl: "https://api.example.com",
      environment: "production"
    };
```

## Best Practices

- Bake only truly build-time constants into the React bundle. Use a runtime config file (served as a JS file) for values that differ per environment.
- Enable gzip or Brotli compression in Nginx to reduce bundle size over the wire.
- Use content-addressed filenames (Vite and webpack do this by default) so you can set aggressive `Cache-Control` headers on static assets while always serving a fresh `index.html`.
- Set Horizontal Pod Autoscaler on the Nginx Deployment; static file serving is CPU-light but benefits from scale-out under high concurrency.
- Use Flux's `dependsOn` to ensure a ConfigMap Kustomization is applied before the application Kustomization.

## Conclusion

Deploying a React SPA with Flux CD gives you a reliable, GitOps-driven pipeline from code commit to production serving. The Nginx container handles client-side routing and caching, Flux ensures the cluster matches your Git repository, and the image automation controller keeps your deployments current with new builds.
