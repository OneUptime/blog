# How to Build ArgoCD from Source

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Development, Go

Description: Step-by-step guide to building ArgoCD from source code, including setting up dependencies, compiling components, building container images, and running locally.

---

Building ArgoCD from source is essential when you need to debug issues, test patches, develop custom features, or maintain an internal fork. While ArgoCD releases official container images and binaries, understanding the build process gives you full control over the tool. This guide covers everything from cloning the repository to running a locally built ArgoCD on your Kubernetes cluster.

## Prerequisites

ArgoCD is written in Go (backend) and TypeScript/React (frontend). You need a specific set of tools installed before you can build.

```bash
# Check Go version - for Argo CD v2.10.x, use Go 1.21
# Current development branches may require a newer Go version; check go.mod.

go version
# go version go1.21.6 linux/amd64

# Node.js 20+ and Yarn for the v2.10.x UI
# Current development branches may use pnpm; check ui/package.json.
node --version
# v20.11.0
yarn --version
# 1.22.21

# protoc for Protocol Buffers compilation
protoc --version
# libprotoc 3.17.3

# Docker or Podman for building container images
docker version

# Make - the build system uses Makefiles
make --version

# kubectl for deploying
kubectl version --client
```

If you are on macOS, you can install most of these with Homebrew.

```bash
brew install go node yarn protobuf make kubectl
brew install --cask docker
```

## Cloning and Preparing the Source

Start by cloning the ArgoCD repository.

```bash
# Clone the repository
# Argo CD v2.10.x code generation targets expect this GOPATH location.
mkdir -p "$(go env GOPATH)/src/github.com/argoproj"
cd "$(go env GOPATH)/src/github.com/argoproj"
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
# - protoc and protobuf Go code generators
# - protoc-gen-grpc-gateway (gRPC gateway generator)
# - Kubernetes code generators
# - controller-gen, goimports, kustomize, Helm, and gotestsum
# - swagger/OpenAPI tools (API documentation generators)

# Install goreman separately if it is not already on your PATH
go install github.com/mattn/goreman@latest
```

## Generating Code

ArgoCD uses code generation extensively for Protocol Buffers, mocks, and API clients. You must run code generation before building.

```bash
# Generate all auto-generated code with the local toolchain
make codegen-local

# This runs several sub-targets:
# - protobuf generation (gRPC services)
# - mock generation (test mocks)
# - client generation (API clients)
# - deepcopy generation (Kubernetes-style deep copy methods)
```

If you only changed protobuf files, you can regenerate just those.

```bash
# Regenerate protobuf code only
make protogen
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

For deploying to Kubernetes, you need to build an ArgoCD container image that contains the component entrypoints.

```bash
# Build all container images locally
# This builds a single argocd image with entrypoints for argocd-server,
# argocd-repo-server, argocd-application-controller, argocd-dex, and other components.
make image

# Build with a custom tag
IMAGE_TAG=custom-build make image

# Build a development image using locally compiled binaries
DEV_IMAGE=true IMAGE_TAG=custom-build make image
```

The Dockerfile uses a multi-stage build process. Here is a simplified view of what happens.

```dockerfile
# Stage 1: Build the UI
FROM node:20 AS ui-builder
WORKDIR /src/ui
COPY ui/ .
RUN yarn install && yarn build

# Stage 2: Build the Go binaries with the compiled UI assets
FROM golang:1.21 AS argocd-build
WORKDIR /src
COPY . .
COPY --from=ui-builder /src/ui/dist/app /src/ui/dist/app
RUN make argocd-all

# Stage 3: Final image
FROM ubuntu:22.04
COPY --from=argocd-build /src/dist/argocd* /usr/local/bin/
RUN ln -s /usr/local/bin/argocd /usr/local/bin/argocd-server && \
    ln -s /usr/local/bin/argocd /usr/local/bin/argocd-repo-server && \
    ln -s /usr/local/bin/argocd /usr/local/bin/argocd-application-controller
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
ARGOCD_API_URL=https://argocd.example.com yarn start
```

## Running a Local Build

You can run all ArgoCD components locally using goreman, which manages multiple processes.

```bash
# Start a local Kubernetes cluster if you don't have one
kind create cluster --name argocd-dev

# Create the argocd namespace
kubectl create namespace argocd

# Install ArgoCD resources from your checkout
kubectl apply -n argocd --server-side --force-conflicts -f manifests/install.yaml
kubectl config set-context --current --namespace=argocd

# Stop the in-cluster ArgoCD pods before running local processes
kubectl -n argocd scale statefulset/argocd-application-controller --replicas 0
kubectl -n argocd scale deployment/argocd-dex-server --replicas 0
kubectl -n argocd scale deployment/argocd-repo-server --replicas 0
kubectl -n argocd scale deployment/argocd-server --replicas 0
kubectl -n argocd scale deployment/argocd-redis --replicas 0
kubectl -n argocd scale deployment/argocd-applicationset-controller --replicas 0
kubectl -n argocd scale deployment/argocd-notifications-controller --replicas 0

# Start all ArgoCD components locally
make start-local ARGOCD_GPG_ENABLED=false

# This uses goreman to start:
# - argocd-server (API server + UI)
# - argocd-repo-server (manifest generation)
# - argocd-application-controller (sync engine)
# - argocd-dex (authentication)
# - redis, the UI dev server, and local test Git/Helm services
```

The `Procfile` in the root directory defines how each component starts.

```bash
# You can also start components individually
# Start just the API server
ARGOCD_BINARY_NAME=argocd-server go run ./cmd/main.go

# Start just the controller
ARGOCD_BINARY_NAME=argocd-application-controller go run ./cmd/main.go

# Start just the repo server
ARGOCD_BINARY_NAME=argocd-repo-server go run ./cmd/main.go
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
