# How to Set Up ko for Fast Go Application Development and Deployment on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Go

Description: Learn how to use ko to streamline Go application development and deployment on Kubernetes with fast container image builds, automatic configuration, and seamless integration with kubectl.

---

Building and deploying Go applications to Kubernetes typically requires creating Dockerfiles, building images, pushing to registries, and updating manifests. This multi-step process slows down development and adds complexity. ko is a tool specifically designed for Go applications that eliminates these steps by building container images directly from Go source code and deploying them to Kubernetes in a single command.

ko provides fast, distroless container images, eliminates the need for Dockerfiles, integrates seamlessly with kubectl, and supports efficient caching. In this guide, you'll learn how to use ko to accelerate Go development on Kubernetes.

## Understanding ko Architecture

ko works by analyzing your Go import paths, building binaries with optimized settings, packaging them into minimal distroless base images, pushing to container registries, and resolving image references in Kubernetes manifests. All of this happens automatically without requiring Dockerfiles or manual image management.

The tool uses Google's distroless base images by default, which contain only your application and its runtime dependencies, resulting in tiny images with minimal attack surface.

## Installing and Configuring ko

Install ko:

```bash
# macOS
brew install ko

# Linux
go install github.com/google/ko@latest

# Verify installation
ko version

# Set default registry
export KO_DOCKER_REPO=gcr.io/my-project
# Or for Docker Hub
export KO_DOCKER_REPO=docker.io/myusername
# Or for local registry
export KO_DOCKER_REPO=localhost:5000

# Add to shell profile
echo 'export KO_DOCKER_REPO=gcr.io/my-project' >> ~/.bashrc
```

Create a simple Go application:

```go
// cmd/api/main.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
)

type Response struct {
    Message string `json:"message"`
    Version string `json:"version"`
    Host    string `json:"host"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "status": "healthy",
    })
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
    hostname, _ := os.Hostname()

    response := Response{
        Message: "Hello from ko!",
        Version: "1.0.0",
        Host:    hostname,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/api", apiHandler)

    log.Printf("Starting server on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

Initialize Go module:

```bash
go mod init github.com/myorg/myapp
go mod tidy
```

## Building and Publishing Images

Build and publish an image:

```bash
# Build and publish to configured registry
ko build ./cmd/api

# Build for specific platform
ko build --platform=linux/amd64 ./cmd/api
ko build --platform=linux/arm64 ./cmd/api

# Build for multiple platforms
ko build --platform=linux/amd64,linux/arm64 ./cmd/api

# Build without publishing (load to Docker daemon)
ko build --local ./cmd/api

# Build with custom tags
ko build --tags=v1.0.0,latest ./cmd/api

# Build and print image reference
IMAGE=$(ko build ./cmd/api)
echo "Built image: $IMAGE"
```

## Creating Kubernetes Manifests with ko

Create deployment manifest:

```yaml
# config/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        # ko will replace this with the built image
        image: ko://github.com/myorg/myapp/cmd/api
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: PORT
          value: "8080"
        resources:
          requests:
            cpu: 100m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 5
          periodSeconds: 3
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
```

Deploy with ko:

```bash
# Build, push, and deploy in one command
ko apply -f config/

# Deploy to specific namespace
ko apply -n production -f config/

# Deploy with kubectl-like options
ko apply -f config/ --wait --timeout=5m

# Dry run (show what would be deployed)
ko apply -f config/ --dry-run

# Resolve images without deploying
ko resolve -f config/
```

## Configuring ko with .ko.yaml

Create a ko configuration file:

```yaml
# .ko.yaml
defaultBaseImage: gcr.io/distroless/static-debian11
baseImageOverrides:
  github.com/myorg/myapp/cmd/api: gcr.io/distroless/base-debian11
  github.com/myorg/myapp/cmd/worker: gcr.io/distroless/static-debian11

builds:
  - id: api
    main: ./cmd/api
    env:
      - GOOS=linux
      - GOARCH=amd64
    flags:
      - -trimpath
    ldflags:
      - -s -w
      - -X main.Version={{.Version}}
      - -X main.Commit={{.Commit}}

  - id: worker
    main: ./cmd/worker
    env:
      - GOOS=linux
      - GOARCH=amd64
    flags:
      - -trimpath
    ldflags:
      - -s -w
```

## Optimizing Build Performance

Use build flags for optimization:

```bash
# Build with optimizations
ko build \
  --bare \
  --platform=linux/amd64 \
  --sbom=none \
  ./cmd/api

# Disable SBOM generation for faster builds
export COSIGN_EXPERIMENTAL=0

# Use local builds during development
ko build --local ./cmd/api

# Cache builds with BuildKit
export KO_DOCKER_REPO=ko.local
ko build --push=false ./cmd/api
```

Create a Makefile for common tasks:

```makefile
# Makefile
.PHONY: build deploy dev clean

# Configuration
IMAGE_NAME ?= api-service
NAMESPACE ?= default

build:
	@echo "Building with ko..."
	ko build ./cmd/api

deploy:
	@echo "Deploying to Kubernetes..."
	ko apply -f config/ -n $(NAMESPACE)

dev:
	@echo "Starting development mode..."
	ko apply -f config/ --watch -n $(NAMESPACE)

clean:
	@echo "Cleaning up..."
	kubectl delete -f config/ -n $(NAMESPACE) --ignore-not-found

logs:
	@echo "Streaming logs..."
	kubectl logs -f -n $(NAMESPACE) -l app=$(IMAGE_NAME)

test:
	@echo "Running tests..."
	go test -v ./...

lint:
	@echo "Running linter..."
	golangci-lint run

# Development workflow
dev-loop: test build deploy logs
```

## Integrating with CI/CD

GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  KO_DOCKER_REPO: gcr.io/${{ secrets.GCP_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: google-github-actions/setup-gcloud@v1

      - name: Configure Docker for GCR
        run: gcloud auth configure-docker

      - name: Install ko
        run: |
          go install github.com/google/ko@latest

      - name: Build and deploy
        run: |
          ko apply -f config/ --bare

      - name: Verify deployment
        run: |
          kubectl wait --for=condition=available --timeout=300s \
            deployment/api-service
```

GitLab CI configuration:

```yaml
# .gitlab-ci.yml
image: golang:1.21

variables:
  KO_DOCKER_REPO: $CI_REGISTRY_IMAGE

stages:
  - build
  - deploy

build:
  stage: build
  before_script:
    - go install github.com/google/ko@latest
    - echo $CI_REGISTRY_PASSWORD | docker login -u $CI_REGISTRY_USER --password-stdin $CI_REGISTRY
  script:
    - ko build ./cmd/api --bare
  only:
    - main

deploy:
  stage: deploy
  image: google/cloud-sdk:alpine
  before_script:
    - go install github.com/google/ko@latest
    - kubectl config use-context $KUBE_CONTEXT
  script:
    - ko apply -f config/
  only:
    - main
```

## Using ko with Helm

Integrate ko with Helm charts:

```yaml
# charts/api/values.yaml
image:
  # ko will replace this
  repository: ko://github.com/myorg/myapp/cmd/api
  pullPolicy: IfNotPresent
  tag: ""

replicaCount: 3

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 200m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 64Mi
```

Deploy with ko and Helm:

```bash
# Resolve ko references and pass to Helm
ko resolve -f charts/api/values.yaml | \
  helm install api-service charts/api -f -

# Or use ko to build and Helm to deploy
IMAGE=$(ko build ./cmd/api)
helm install api-service charts/api \
  --set image.repository=$(echo $IMAGE | cut -d: -f1) \
  --set image.tag=$(echo $IMAGE | cut -d: -f2)
```

## Multi-Service Applications

Manage multiple services:

```
project/
├── cmd/
│   ├── api/
│   │   └── main.go
│   ├── worker/
│   │   └── main.go
│   └── migrator/
│       └── main.go
├── config/
│   ├── api.yaml
│   ├── worker.yaml
│   └── migrator-job.yaml
└── .ko.yaml
```

Deployment manifests:

```yaml
# config/api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
      - name: api
        image: ko://github.com/myorg/project/cmd/api
---
# config/worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  template:
    spec:
      containers:
      - name: worker
        image: ko://github.com/myorg/project/cmd/worker
---
# config/migrator-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrator
spec:
  template:
    spec:
      containers:
      - name: migrator
        image: ko://github.com/myorg/project/cmd/migrator
      restartPolicy: OnFailure
```

Deploy all services:

```bash
# Build and deploy everything
ko apply -f config/

# Deploy specific services
ko apply -f config/api.yaml
ko apply -f config/worker.yaml
```

## Local Development Workflow

Create a development script:

```bash
#!/bin/bash
# dev.sh

set -e

export KO_DOCKER_REPO=kind.local
CLUSTER_NAME="dev-cluster"

# Create kind cluster if it doesn't exist
if ! kind get clusters | grep -q "$CLUSTER_NAME"; then
    echo "Creating kind cluster..."
    kind create cluster --name "$CLUSTER_NAME"
fi

# Build and load image to kind
echo "Building and loading image..."
ko build --local ./cmd/api

# Deploy to kind cluster
echo "Deploying to kind..."
ko apply -f config/

# Wait for deployment
echo "Waiting for deployment..."
kubectl wait --for=condition=available --timeout=300s deployment/api-service

# Port forward
echo "Setting up port forward..."
kubectl port-forward svc/api-service 8080:80 &
PF_PID=$!

echo ""
echo "✅ Development environment ready!"
echo "API available at: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $PF_PID; kind delete cluster --name $CLUSTER_NAME" EXIT

wait $PF_PID
```

ko transforms Go application development on Kubernetes by eliminating the complexity of container image management. With fast builds, automatic image resolution, and seamless kubectl integration, ko enables rapid iteration cycles where code changes can be deployed to Kubernetes clusters in seconds, making cloud-native Go development as fast and simple as local development.
