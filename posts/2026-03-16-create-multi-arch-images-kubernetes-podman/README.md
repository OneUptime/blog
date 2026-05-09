# How to Create Multi-Arch Images for Kubernetes with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, Kubernetes

Description: Learn how to build and push multi-architecture container images with Podman that work seamlessly across mixed-architecture Kubernetes clusters.

---

> Multi-arch images let Kubernetes automatically pull the right binary for each node, whether it runs on amd64, arm64, or any other supported architecture.

Kubernetes clusters increasingly run on mixed architectures. ARM-based nodes offer cost savings, while x86 remains the default for many workloads. Creating multi-architecture images ensures your applications deploy correctly on any node without architecture-specific image tags. This guide shows you how to build them with Podman.

---

## Why Multi-Arch Images Matter for Kubernetes

Kubernetes schedules pods based on resource availability, not architecture. If your image only supports amd64 and a pod lands on an arm64 node, it fails. Multi-arch images solve this by bundling platform-specific images under a single manifest.

```bash
# A multi-arch image works on any node

kubectl run myapp --image=registry.example.com/myapp:latest
# Kubernetes pulls the correct architecture automatically
```

## Setting Up Your Build Environment

```bash
# Install Podman and QEMU for cross-architecture builds
# Fedora/RHEL
sudo dnf install -y podman qemu-user-static

# Ubuntu/Debian
sudo apt-get install -y podman qemu-user-static

# Verify QEMU emulation is registered
ls /proc/sys/fs/binfmt_misc/qemu-*
```

## Writing an Architecture-Aware Containerfile

```dockerfile
# Containerfile
FROM golang:1.21 AS builder

# Pass these ARGs from the build command based on the target platform
ARG TARGETOS=linux
ARG TARGETARCH=amd64

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Build for the target platform
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-s -w" -o /app ./cmd/server

FROM scratch
COPY --from=builder /app /app
EXPOSE 8080
ENTRYPOINT ["/app"]
```

## Building Multi-Arch Images with Manifest Lists

```bash
#!/bin/bash
# build-multiarch.sh - Build multi-arch images for Kubernetes

IMAGE="registry.example.com/myapp"
TAG="v1.0"

# Target architectures common in Kubernetes clusters
PLATFORMS=("linux/amd64" "linux/arm64")

# Clean up any existing manifest list
podman manifest rm "${IMAGE}:${TAG}" 2>/dev/null || true

# Create a new manifest list
podman manifest create "${IMAGE}:${TAG}"

# Build for each platform and add to the manifest
for PLATFORM in "${PLATFORMS[@]}"; do
    OS="${PLATFORM%/*}"
    ARCH="${PLATFORM#*/}"
    echo "Building for ${PLATFORM}..."

    podman build \
        --platform "${PLATFORM}" \
        --build-arg "TARGETOS=${OS}" \
        --build-arg "TARGETARCH=${ARCH}" \
        -t "${IMAGE}:${TAG}-${ARCH}" \
        -f Containerfile \
        .

    # Add the architecture-specific image to the manifest list
    podman manifest add "${IMAGE}:${TAG}" "${IMAGE}:${TAG}-${ARCH}"
done

# Push the manifest list to the registry
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"

echo "Multi-arch image pushed: ${IMAGE}:${TAG}"
```

## Verifying the Multi-Arch Image

```bash
# Inspect the manifest to confirm all architectures are present
podman manifest inspect "${IMAGE}:${TAG}"

# Check specific platform support from the registry
skopeo inspect --raw "docker://${IMAGE}:${TAG}" | python3 -m json.tool
```

## Deploying to Kubernetes

Create a deployment that works on any node architecture:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: registry.example.com/myapp:v1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

```bash
# Deploy - works on amd64 and arm64 nodes alike
kubectl apply -f deployment.yaml

# Verify pods are running on different architectures
kubectl get pods -o wide
```

## Testing Architecture-Specific Behavior

```bash
# Run a test pod on a specific architecture using nodeSelector
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: myapp-arm64-test
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
  containers:
  - name: myapp
    image: registry.example.com/myapp:v1.0
    command: ["./app", "--health-check"]
EOF

# Check the pod status
kubectl logs myapp-arm64-test
```

## Automating with a Makefile

```makefile
# Makefile for multi-arch Kubernetes image builds

IMAGE ?= registry.example.com/myapp
TAG ?= $(shell git describe --tags --always)
PLATFORMS ?= linux/amd64,linux/arm64
comma := ,

.PHONY: build-multiarch push-multiarch

build-multiarch:
	podman manifest rm $(IMAGE):$(TAG) 2>/dev/null || true
	podman manifest create $(IMAGE):$(TAG)
	@for platform in $(subst $(comma), ,$(PLATFORMS)); do \
		os=$$(echo $$platform | cut -d/ -f1); \
		arch=$$(echo $$platform | cut -d/ -f2); \
		echo "Building $$platform..."; \
		podman build --platform $$platform \
			--build-arg TARGETOS=$$os \
			--build-arg TARGETARCH=$$arch \
			-t $(IMAGE):$(TAG)-$$arch .; \
		podman manifest add $(IMAGE):$(TAG) $(IMAGE):$(TAG)-$$arch; \
	done

push-multiarch: build-multiarch
	podman manifest push --all $(IMAGE):$(TAG) docker://$(IMAGE):$(TAG)
	@echo "Pushed $(IMAGE):$(TAG)"
```

## Summary

Building multi-arch images for Kubernetes with Podman involves creating platform-specific builds, grouping them into a manifest list, and pushing the manifest to your registry. Kubernetes then automatically selects the correct image for each node architecture. Use QEMU emulation for foreign-architecture build steps or Podman farms for native builds on remote machines.
