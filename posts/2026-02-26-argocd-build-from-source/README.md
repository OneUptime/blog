# How to Build ArgoCD from Source

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Development, Go

Description: Step-by-step guide to building ArgoCD from source code, including setting up dependencies, compiling components, building container images, and running locally.

---

Building ArgoCD from source is essential when you need to debug issues, test patches, develop custom features, or maintain an internal fork. While ArgoCD releases official container images and binaries, understanding the build process gives you full control over the tool. This guide covers everything from cloning the repository to running a locally built ArgoCD on your Kubernetes cluster.

## Prerequisites

ArgoCD is written in Go (backend) and TypeScript/React (frontend). You need a specific set of tools installed before you can build.

```bash
# Check Go version - ArgoCD requires Go 1.21+
go version
# go version go1.21.6 linux/amd64

# Node.js 20+ and Yarn for the UI
node --version
# v20.11.0
yarn --version
# 1.22.21

# protoc for Protocol Buffers compilation
protoc --version
# libprotoc 25.1

# Docker or Podman for building container images
docker version

# Make - the build system uses Makefiles
make --version

# kubectl for deploying
kubectl version --client
```

If you are on macOS, you can install most of these with Homebrew.

```bash
brew install go node yarn protobuf docker make kubectl
```

## Cloning and Preparing the Source

Start by cloning the ArgoCD repository.

```bash
# Clone the repository
git clone https://github.com/argoproj/argo-cd.git
cd argo-cd

# If you want to build a specific version, check out the tag
git checkout v2.10.2

# Or stay on the latest development branch
git checkout master
```

Install the Go build tools that ArgoCD needs.

```bash
# Install all required Go tools (protoc plugins, code generators, etc.)
make install-tools-local

# This installs:
# - protoc-gen-go (protobuf Go code generator)
# - protoc-gen-grpc-gateway (gRPC gateway generator)
# - mockery (mock generator for tests)
# - goreman (process manager for local development)
# - swagger (API documentation generator)
```

## Generating Code

ArgoCD uses code generation extensively for Protocol Buffers, mocks, and API clients. You must run code generation before building.

```bash
# Generate all auto-generated code
make generate-local

# This runs several sub-targets:
# - protobuf generation (gRPC services)
# - mock generation (test mocks)
# - client generation (API clients)
# - deepcopy generation (Kubernetes-style deep copy methods)
```

If you only changed protobuf files, you can regenerate just those.

```bash
# Regenerate protobuf code only
make protogen-local
```

## Building the CLI

The ArgoCD CLI is the simplest component to build. It is a single Go binary.

```bash
# Build the CLI for your current platform
make cli-local

# The binary is output to dist/argocd
./dist/argocd version --client

# Build for a specific platform
GOOS=linux GOARCH=amd64 make cli-local
GOOS=darwin GOARCH=arm64 make cli-local
```

You can also build the CLI directly with Go.

```bash
# Direct Go build with version information
CGO_ENABLED=0 go build \
  -ldflags "-X github.com/argoproj/argo-cd/v2/common.version=v2.10.2-custom \
            -X github.com/argoproj/argo-cd/v2/common.buildDate=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
            -X github.com/argoproj/argo-cd/v2/common.gitCommit=$(git rev-parse HEAD)" \
  -o dist/argocd \
  ./cmd
```

## Building Container Images

For deploying to Kubernetes, you need to build container images for each ArgoCD component.

```bash
# Build all container images locally
# This builds: argocd-server, argocd-repo-server, argocd-application-controller, argocd-dex
make image

# Build with a custom tag
IMAGE_TAG=custom-build make image

# Build a specific component only
make image-argocd
```

The Dockerfile uses a multi-stage build process. Here is a simplified view of what happens.

```dockerfile
# Stage 1: Build the Go binaries
FROM golang:1.21 AS builder
WORKDIR /src
COPY . .
RUN make build-all

# Stage 2: Build the UI
FROM node:20 AS ui-builder
WORKDIR /src/ui
COPY ui/ .
RUN yarn install && yarn build

# Stage 3: Final image
FROM ubuntu:22.04
COPY --from=builder /src/dist/* /usr/local/bin/
COPY --from=ui-builder /src/ui/dist /shared/app
# ... additional runtime dependencies
```

If you need to build with custom patches, modify the source first and then build.

```bash
# Apply a patch and build
git apply my-custom-fix.patch
IMAGE_TAG=patched-v2.10.2 make image

# For local testing with kind or minikube
kind load docker-image argoproj/argocd:patched-v2.10.2
# or
minikube image load argoproj/argocd:patched-v2.10.2
```

## Building the UI Separately

If you are working on UI changes, you can build and serve the frontend independently.

```bash
cd ui

# Install dependencies
yarn install

# Build for production
yarn build

# Or run the development server with hot reload
yarn start
# This starts a dev server on http://localhost:4000
# It proxies API requests to a running ArgoCD server
```

The UI development server can be pointed at any ArgoCD instance.

```bash
# Point the dev server at your ArgoCD instance
ARGOCD_SERVER=https://argocd.example.com yarn start
```

## Running a Local Build

You can run all ArgoCD components locally using goreman, which manages multiple processes.

```bash
# Start a local Kubernetes cluster if you don't have one
kind create cluster --name argocd-dev

# Install ArgoCD CRDs
kubectl apply -k manifests/crds

# Create the argocd namespace
kubectl create namespace argocd

# Start all ArgoCD components locally
make start-local

# This uses goreman to start:
# - argocd-server (API server + UI)
# - argocd-repo-server (manifest generation)
# - argocd-application-controller (sync engine)
# - argocd-dex (authentication)
```

The `Procfile` in the root directory defines how each component starts.

```bash
# You can also start components individually
# Start just the API server
go run ./cmd/argocd-server

# Start just the controller
go run ./cmd/argocd-application-controller

# Start just the repo server
go run ./cmd/argocd-repo-server
```

## Cross-Compilation

If you need to build for a different platform than your development machine, Go makes cross-compilation straightforward.

```bash
# Build for Linux AMD64 (common for Kubernetes nodes)
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o dist/argocd-linux-amd64 ./cmd

# Build for Linux ARM64
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o dist/argocd-linux-arm64 ./cmd

# Build multi-arch container images
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myregistry/argocd:custom \
  --push .
```

## Deploying Your Custom Build

After building custom images, deploy them to your cluster.

```bash
# If using the standard manifests, update the image references
kubectl set image deployment/argocd-server \
  argocd-server=myregistry/argocd:custom-build -n argocd

kubectl set image deployment/argocd-repo-server \
  argocd-repo-server=myregistry/argocd:custom-build -n argocd

kubectl set image statefulset/argocd-application-controller \
  argocd-application-controller=myregistry/argocd:custom-build -n argocd
```

If you are using the Helm chart, override the image in your values file.

```yaml
# custom-values.yaml
global:
  image:
    repository: myregistry/argocd
    tag: custom-build

server:
  image:
    repository: myregistry/argocd
    tag: custom-build

controller:
  image:
    repository: myregistry/argocd
    tag: custom-build

repoServer:
  image:
    repository: myregistry/argocd
    tag: custom-build
```

```bash
helm upgrade argocd argo/argo-cd -n argocd -f custom-values.yaml
```

## Troubleshooting Build Issues

Common build problems and their solutions:

**Protobuf version mismatch.** If you see protobuf generation errors, ensure your protoc version matches what the project expects. Check the Makefile or CI configuration for the required version.

**Go module cache issues.** Sometimes the Go module cache becomes stale. Clean it and retry.

```bash
go clean -cache -modcache
go mod download
```

**Node module issues.** If the UI build fails, try a clean install.

```bash
cd ui
rm -rf node_modules
yarn install --frozen-lockfile
```

**Docker build context too large.** The `.dockerignore` file should handle this, but if your build context is enormous, check that you do not have large files in the repository root.

Building ArgoCD from source opens up possibilities for custom patches, debugging, and contributing back to the project. Once you are comfortable with the build process, check out our guide on [contributing to the ArgoCD open source project](https://oneuptime.com/blog/post/2026-02-26-argocd-contribute-open-source/view) to take the next step.
