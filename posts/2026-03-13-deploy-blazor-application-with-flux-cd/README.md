# How to Deploy a Blazor Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Blazor, .NET, WebAssembly, C#

Description: Deploy a Blazor WebAssembly application to Kubernetes using Flux CD, serving the compiled WASM bundle with Nginx and injecting runtime configuration.

---

## Introduction

Blazor WebAssembly compiles your C# code to WebAssembly that runs directly in the browser, without a JavaScript framework. Like React or Vue SPAs, the output is a set of static files — HTML, CSS, JavaScript bootstrap, and `.wasm` binaries — that can be served by any web server. Blazor Server, by contrast, runs on ASP.NET Core and requires a persistent server process.

This guide focuses on Blazor WebAssembly (WASM), the statically servable variant. The deployment pattern is similar to React and Vue: build the app, copy the output into an Nginx container, and serve. The unique consideration is that Blazor WASM bundles include `.wasm` files that must be served with the correct `application/wasm` MIME type, and the files can be large — compression is important.

Flux CD manages the entire lifecycle, from the initial deployment to automated image updates when your CI pipeline produces new builds.

## Prerequisites

- A Blazor WebAssembly 8.x application (.NET 8 or 9)
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs installed

## Step 1: Publish and Containerize the Blazor WASM Application

```dockerfile
# Dockerfile — build with .NET SDK, serve with Nginx
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder
WORKDIR /app

# Restore dependencies
COPY *.csproj ./
RUN dotnet restore

# Publish the Blazor WASM app
COPY . .
RUN dotnet publish \
    --configuration Release \
    --output /app/publish

# Serve the static Blazor output with Nginx
FROM nginx:1.27-alpine AS runner
# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy Nginx config with Blazor WASM MIME type and compression support
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Blazor WASM output is in wwwroot
COPY --from=builder /app/publish/wwwroot /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf — Blazor WASM requires correct MIME types and SPA routing
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Required: serve .wasm files with the correct MIME type
    types {
        application/wasm wasm;
    }

    # Enable gzip for text-based assets
    gzip on;
    gzip_types text/plain text/css application/javascript application/json
               application/wasm application/octet-stream;

    # Enable Brotli pre-compressed files (.br) if they exist
    location ~ \.(js|wasm|css)$ {
        gzip_static on;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA fallback — route all unmatched requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
        # index.html should not be cached
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

```bash
docker build -t ghcr.io/your-org/my-blazor-app:1.0.0 .
docker push ghcr.io/your-org/my-blazor-app:1.0.0
```

## Step 2: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-blazor-app
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: blazor-runtime-config
  namespace: my-blazor-app
data:
  # Blazor WASM can load runtime config from appsettings.json served as a static file
  # Or use a config.js approach for simpler JavaScript interop
  appsettings.Production.json: |
    {
      "ApiBaseUrl": "https://api.example.com",
      "Environment": "Production"
    }
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-blazor-app
  namespace: my-blazor-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-blazor-app
  template:
    metadata:
      labels:
        app: my-blazor-app
    spec:
      containers:
        - name: my-blazor-app
          image: ghcr.io/your-org/my-blazor-app:1.0.0  # {"$imagepolicy": "flux-system:my-blazor-app"}
          ports:
            - containerPort: 80
          volumeMounts:
            # Mount environment-specific appsettings at the wwwroot path
            - name: runtime-config
              mountPath: /usr/share/nginx/html/appsettings.Production.json
              subPath: appsettings.Production.json
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"   # Nginx serving static files is very lightweight
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
            name: blazor-runtime-config
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-blazor-app
  namespace: my-blazor-app
spec:
  selector:
    app: my-blazor-app
  ports:
    - port: 80
      targetPort: 80
---
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-blazor-app
  namespace: my-blazor-app
  annotations:
    nginx.ingress.kubernetes.io/enable-brotli: "true"
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
                name: my-blazor-app
                port:
                  number: 80
```

## Step 3: Configure Flux GitRepository and Kustomization

```yaml
# clusters/my-cluster/apps/my-blazor-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-blazor-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-blazor-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-blazor-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-blazor-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-blazor-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-blazor-app
      namespace: my-blazor-app
```

## Step 4: Configure Image Automation

```yaml
# clusters/my-cluster/apps/my-blazor-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-blazor-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-blazor-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-blazor-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-blazor-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-blazor-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-blazor-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update blazor app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 5: Verify the Deployment

```bash
flux get kustomizations my-blazor-app
kubectl get pods -n my-blazor-app

kubectl port-forward -n my-blazor-app svc/my-blazor-app 8080:80
# Open http://localhost:8080 in a browser to verify the Blazor app loads
```

## Best Practices

- Always configure Nginx to serve `.wasm` files with `Content-Type: application/wasm`. Without this, some browsers will refuse to compile the module.
- Enable gzip and pre-compressed Brotli (`.br` files) for Blazor WASM bundles — uncompressed WASM can be several megabytes.
- Use `appsettings.Production.json` mounted from a ConfigMap for runtime configuration so API base URLs and feature flags can differ per environment without rebuilding the image.
- Set aggressive caching headers on fingerprinted static assets (`.wasm`, `.js`, `.css`) but use `no-cache` on `index.html` to ensure users always get the latest version.
- Consider Blazor's lazy loading feature for large assemblies to reduce the initial download size.

## Conclusion

Blazor WebAssembly deploys to Kubernetes exactly like a React or Vue SPA: static files served by Nginx. The key differences are the `application/wasm` MIME type requirement and the larger initial bundle size that benefits from compression. Flux CD manages the entire lifecycle, ensuring your compiled C# frontend is deployed consistently and automatically across all environments.
