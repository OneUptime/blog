# How to Deploy a Go Application with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Go, Golang, Deployment

Description: Deploy a compiled Go application to Kubernetes using Flux CD GitOps, leveraging Go's minimal runtime footprint for lean container images and fast startup.

---

## Introduction

Go produces statically compiled binaries with no external runtime dependencies, making it one of the easiest languages to containerize efficiently. A Go HTTP server binary can run in a scratch or distroless container, resulting in images that are often under 20 MB. This footprint, combined with Go's fast startup time (typically under 100ms), makes Go applications excellent candidates for Kubernetes microservices that need to scale quickly.

Flux CD brings GitOps discipline to your Go deployments. Instead of running `kubectl apply` after each build, Flux continuously reconciles the cluster against your Git repository. The image automation controller watches your container registry for new tags and automatically commits image tag updates back to Git, closing the loop between your CI pipeline and your Kubernetes cluster.

This guide covers the Go multi-stage Dockerfile, Kubernetes manifest design, and the complete Flux pipeline.

## Prerequisites

- A Go application (`main.go` with an HTTP server or gRPC server)
- A Kubernetes cluster with Flux CD bootstrapped
- A container registry
- `kubectl` and `flux` CLIs installed

## Step 1: Containerize the Go Application

Go's static compilation makes distroless containers practical. The image contains only the binary and essential system certificates.

```dockerfile
# Dockerfile — multi-stage: compile on full Go image, run on distroless
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Download dependencies first (cached separately from source)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build a statically linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=${VERSION:-dev}" \
    -o /app/server ./cmd/server/main.go

# Use Google's distroless image as the runtime base
FROM gcr.io/distroless/static-debian12:nonroot AS runner
# Copy the compiled binary
COPY --from=builder /app/server /server
EXPOSE 8080
# The distroless nonroot image uses UID 65532
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

```bash
docker build -t ghcr.io/your-org/my-go-app:1.0.0 --build-arg VERSION=1.0.0 .
docker push ghcr.io/your-org/my-go-app:1.0.0
```

## Step 2: Add Health Check Endpoints to the Go Server

```go
// cmd/server/main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
)

func main() {
    mux := http.NewServeMux()

    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    })

    mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
        // Add real dependency checks here (DB ping, etc.)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
    })

    mux.HandleFunc("/api/v1/greet", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"message": "Hello from Go!"})
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    log.Printf("Starting server on :%s", port)
    log.Fatal(http.ListenAndServe(":"+port, mux))
}
```

## Step 3: Write Kubernetes Manifests

```yaml
# deploy/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-go-app
---
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-go-app
  namespace: my-go-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-go-app
  template:
    metadata:
      labels:
        app: my-go-app
    spec:
      # Go distroless images are very secure — enforce it
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: my-go-app
          image: ghcr.io/your-org/my-go-app:1.0.0  # {"$imagepolicy": "flux-system:my-go-app"}
          ports:
            - containerPort: 8080
          env:
            - name: PORT
              value: "8080"
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: go-app-config
                  key: LOG_LEVEL
          resources:
            # Go apps are resource-efficient
            requests:
              cpu: "50m"
              memory: "32Mi"
            limits:
              cpu: "500m"
              memory: "128Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5   # Go starts instantly
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 3
            periodSeconds: 10
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
---
# deploy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: go-app-config
  namespace: my-go-app
data:
  LOG_LEVEL: "info"
---
# deploy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-go-app
  namespace: my-go-app
spec:
  selector:
    app: my-go-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
---
# deploy/pdb.yaml — ensure at least 2 replicas during disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-go-app-pdb
  namespace: my-go-app
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-go-app
```

## Step 4: Configure Flux GitRepository and Kustomization

```yaml
# clusters/my-cluster/apps/my-go-app/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-go-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-go-app
  ref:
    branch: main
---
# clusters/my-cluster/apps/my-go-app/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-go-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-go-app
  path: ./deploy
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-go-app
      namespace: my-go-app
```

## Step 5: Configure Image Automation

```yaml
# clusters/my-cluster/apps/my-go-app/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-go-app
  namespace: flux-system
spec:
  image: ghcr.io/your-org/my-go-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-go-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-go-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-go-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-go-app
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Bot
      messageTemplate: "chore: update go app to {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 6: Verify the Deployment

```bash
# Check Flux status
flux get kustomizations my-go-app

# Go pods start almost instantly — they should be Ready within seconds
kubectl get pods -n my-go-app

# Test the API
kubectl port-forward -n my-go-app svc/my-go-app 8080:80
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/greet
```

## Best Practices

- Build with `CGO_ENABLED=0` to produce a truly static binary that runs without glibc, enabling the use of `scratch` or distroless base images.
- Use `-ldflags="-w -s"` to strip debug symbols and reduce binary size.
- Implement graceful shutdown in your Go HTTP server by listening for `SIGTERM` and calling `server.Shutdown(ctx)` with a timeout.
- Set `readOnlyRootFilesystem: true` in the security context; Go apps rarely need to write to the filesystem at runtime.
- Use `go.sum` and Go module proxy caching in CI to ensure reproducible builds, then pin the exact module versions.

## Conclusion

Go's statically compiled binaries and minimal runtime make it one of the best-suited languages for containerized Kubernetes workloads. Combined with Flux CD's GitOps model, you get tiny images, near-instant startup, minimal resource usage, and a fully auditable deployment pipeline where every change flows through Git.
