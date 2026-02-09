# How to Build Minimal Container Images with Distroless and Chainguard for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Container Images, Distroless, Chainguard

Description: Learn how to build minimal container images using Distroless and Chainguard base images to reduce attack surface, improve security, and decrease image sizes in Kubernetes deployments.

---

Traditional base images like Ubuntu or Alpine include package managers, shells, and utilities that most applications never use. These components increase attack surface and image size. Distroless and Chainguard images contain only your application and runtime dependencies, eliminating unnecessary attack vectors. This guide shows you how to build minimal images for Kubernetes.

## Understanding Minimal Base Images

Distroless images from Google contain only application runtime dependencies without shells, package managers, or other tools. This makes them ideal for production deployments where you don't need debugging utilities. Chainguard Images go further by providing minimal, frequently updated images with software bill of materials (SBOM) for supply chain security.

The key benefit is reduced attack surface. Without shells or package managers, attackers have fewer tools available for exploitation. Smaller images also mean faster pulls, less storage, and quicker vulnerability scanning. For Kubernetes, minimal images improve startup time and reduce cluster resource consumption.

## Building with Distroless Base Images

Create multi-stage builds using Distroless for the runtime stage.

```dockerfile
# Dockerfile for Go application
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o server .

# Distroless runtime stage
FROM gcr.io/distroless/static-debian11

# Copy binary from builder
COPY --from=builder /app/server /server

# No shell available, so use JSON array for CMD
CMD ["/server"]
```

For applications requiring libc:

```dockerfile
FROM gcr.io/distroless/base-debian11

COPY --from=builder /app/server /server
CMD ["/server"]
```

For debugging, use debug variants:

```dockerfile
# Use debug image for troubleshooting
FROM gcr.io/distroless/base-debian11:debug

COPY --from=builder /app/server /server
CMD ["/server"]
```

## Using Chainguard Images

Build with Chainguard's minimal, secure base images.

```dockerfile
# Node.js application with Chainguard
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Chainguard Node runtime
FROM cgr.dev/chainguard/node:latest

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Chainguard images run as non-root by default
USER 65532:65532

CMD ["dist/main.js"]
```

Python application:

```dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

COPY . .

# Chainguard Python runtime
FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --from=builder /root/.local /home/nonroot/.local
COPY --from=builder /app /app

ENV PATH=/home/nonroot/.local/bin:$PATH

USER 65532:65532
CMD ["python", "app.py"]
```

## Configuring Kubernetes for Minimal Images

Deploy minimal images with appropriate security contexts.

```yaml
# distroless-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minimal-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: minimal-app
  template:
    metadata:
      labels:
        app: minimal-app
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
        fsGroup: 65532
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: mycompany/app:distroless
        ports:
        - containerPort: 8080
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 3
```

## Debugging Minimal Images

Debug applications in distroless containers without shells.

```yaml
# ephemeral-debug-container.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-debug
spec:
  containers:
  - name: app
    image: mycompany/app:distroless
  # Add ephemeral debug container
  ephemeralContainers:
  - name: debugger
    image: busybox:latest
    command: ["sh"]
    stdin: true
    tty: true
```

Use kubectl debug:

```bash
# Attach debug container to running pod
kubectl debug -it minimal-app-pod --image=busybox:latest --target=app

# Copy files from distroless container
kubectl cp minimal-app-pod:/app/config.yaml ./config.yaml

# View logs
kubectl logs minimal-app-pod

# Check process list with ephemeral container
kubectl debug minimal-app-pod --image=nicolaka/netshoot -- ps aux
```

Chainguard Images provide SBOM (Software Bill of Materials) for supply chain security and vulnerability tracking. Distroless and Chainguard images eliminate attack surface by removing unnecessary components while maintaining full application functionality. For production Kubernetes deployments, minimal images improve security posture, reduce image sizes, and simplify compliance. Combine minimal images with appropriate security contexts and ephemeral debug containers for secure, maintainable applications.
