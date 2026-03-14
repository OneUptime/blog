# How to Deploy a Vue.js Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Vue.js, JavaScript, SPA, Nginx

Description: Deploy a Vue.js application to Kubernetes using Flux CD GitOps workflow, with Nginx serving and runtime environment variable injection.

---

## Introduction

Vue.js is a progressive JavaScript framework used to build single-page applications that, like React SPAs, compile down to static HTML, JavaScript, and CSS. Serving a Vue.js app on Kubernetes follows the same Nginx-based pattern as other SPA frameworks, but Vue's ecosystem has some unique considerations: the Vue Router's history mode requires Nginx to serve `index.html` for unmatched routes, and Vue projects built with Vite produce highly optimized, content-hashed bundles.

Managing the deployment lifecycle through Flux CD means your infrastructure team and application developers share a single source of truth in Git. Developers push new image tags, Flux's image automation controller detects the new tag and commits the update, and the cluster reconciles automatically. No manual `kubectl apply` is needed.

This guide covers containerizing a Vue.js (Vite) application, writing the Kubernetes manifests, and configuring the Flux pipeline from source to automated image updates.

## Prerequisites

- A Vue.js 3 application built with Vite
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry for storing images
- `kubectl` and `flux` CLIs installed

## Step 1: Containerize the Vue.js Application

```dockerfile
# Dockerfile — multi-stage: build with Node, serve with Nginx
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite outputs to /app/dist by default
RUN npm run build

FROM nginx:1.27-alpine AS runner
# Remove default config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf — handles Vue Router history mode
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # Long-lived caching for hashed assets
    location ~* \.(js|css|woff2|png|jpg|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fallback for Vue Router's history mode
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
docker build -t ghcr.io/your-org/my-vue-app:1.0.0 .
docker push ghcr.io/your-org/my-vue-app:1.0.0
```

## Step 2: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-vue-app
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-vue-app
  namespace: my-vue-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-vue-app
  template:
    metadata:
      labels:
        app: my-vue-app
    spec:
      containers:
        - name: my-vue-app
          image: ghcr.io/your-org/my-vue-app:1.0.0  # {"$imagepolicy": "flux-system:my-vue-app"}
          ports:
            - containerPort: 80
          # Mount the runtime config as a volume
          volumeMounts:
            - name: runtime-config
              mountPath: /usr/share/nginx/html/config.js
              subPath: config.js
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
      volumes:
        - name: runtime-config
          configMap:
            name: vue-runtime-config
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vue-runtime-config
  namespace: my-vue-app
data:
  # This file is loaded by index.html before the Vue app bundle
  config.js: |
    window.APP_CONFIG = {
      apiBaseUrl: "https://api.example.com",
      featureFlags: { newDashboard: true }
    };
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-vue-app
  namespace: my-vue-app
spec:
  selector:
    app: my-vue-app
  ports:
    - port: 80
      targetPort: 80
---
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-vue-app
  namespace: my-vue-app
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
                name: my-vue-app
                port:
                  number: 80
```

## Step 3: Configure Flux Source and Kustomization

```yaml
# clusters/my-cluster/apps/my-vue-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-vue-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-vue-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-vue-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-vue-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-vue-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-vue-app
      namespace: my-vue-app
```

## Step 4: Configure Image Automation

```yaml
# clusters/my-cluster/apps/my-vue-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-vue-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-vue-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-vue-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-vue-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-vue-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-vue-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update my-vue-app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 5: Verify the Deployment

```bash
# Check Flux reconciliation status
flux get kustomizations my-vue-app

# Check pods and services
kubectl get all -n my-vue-app

# Port-forward to test locally
kubectl port-forward -n my-vue-app svc/my-vue-app 8080:80
# Visit http://localhost:8080
```

## Best Practices

- Load the `config.js` file in your `index.html` before any bundled JavaScript so `window.APP_CONFIG` is available when the Vue app initializes: `<script src="/config.js"></script>`.
- Use `vite.config.js` `base` option if deploying to a subpath rather than the root domain.
- Configure Nginx `gzip_comp_level` conservatively (level 4-6) — higher levels increase CPU usage without proportional size reduction.
- Use a `PodDisruptionBudget` to ensure at least one replica is always available during node maintenance.
- For multi-environment deployments, use Kustomize overlays to swap the ConfigMap `config.js` content per environment.

## Conclusion

Vue.js on Kubernetes with Flux CD combines a simple, efficient Nginx serving strategy with the full power of GitOps. Runtime configuration is injected via ConfigMaps, image updates are automated by Flux's image automation controller, and every change is traceable through your Git history. Your Vue.js application is now deployed with the same rigor as any production backend service.
