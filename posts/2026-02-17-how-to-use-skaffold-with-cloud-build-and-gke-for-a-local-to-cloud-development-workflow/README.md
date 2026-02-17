# How to Use Skaffold with Cloud Build and GKE for a Local-to-Cloud Development Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Skaffold, Cloud Build, GKE, Kubernetes, DevOps, CI/CD

Description: Learn how to set up Skaffold with Google Cloud Build and GKE to create a seamless local-to-cloud development workflow for Kubernetes applications.

---

If you have ever worked on a Kubernetes application, you know the pain of the develop-build-push-deploy cycle. You make a small code change, build a Docker image, push it to a registry, update your manifests, and wait for the rollout. Multiply that by dozens of iterations a day and it gets old fast.

Skaffold solves this problem. It watches your source code, automatically builds images, pushes them, and deploys to your cluster. When you pair it with Google Cloud Build for remote builds and GKE as your target cluster, you get a workflow that works the same whether you are developing locally or shipping to production.

## What Skaffold Actually Does

Skaffold is a CLI tool from Google that handles the build-push-deploy loop. You define your pipeline in a `skaffold.yaml` file, and then you run `skaffold dev` to enter a continuous development mode. Every time you save a file, Skaffold rebuilds and redeploys automatically.

The key thing that makes Skaffold useful with GCP is that it supports Cloud Build as a build backend. Instead of building images on your laptop (which can be slow, especially for large projects), you offload the build to Cloud Build's servers.

## Prerequisites

Before we start, make sure you have these in place:

- A GCP project with billing enabled
- The `gcloud` CLI installed and authenticated
- `kubectl` configured to talk to your GKE cluster
- Skaffold installed (v2.x or later)
- A GKE cluster running

If you need to create a GKE cluster quickly, here is the command.

```bash
# Create an Autopilot GKE cluster in us-central1
gcloud container clusters create-auto my-dev-cluster \
  --region=us-central1 \
  --project=my-gcp-project
```

## Setting Up a Sample Application

Let us work with a simple Go web server. Create these files in a new project directory.

Here is the application code.

```go
// main.go - A simple HTTP server that responds with a greeting
package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from Skaffold on GKE!")
    })
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Next, create a Dockerfile.

```dockerfile
# Dockerfile - Multi-stage build for a lean production image
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
# Build a statically linked binary
RUN CGO_ENABLED=0 go build -o server main.go

FROM gcr.io/distroless/static
COPY --from=builder /app/server /server
CMD ["/server"]
```

And the Kubernetes manifest.

```yaml
# k8s/deployment.yaml - Kubernetes deployment and service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app  # Skaffold will replace this with the built image
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

## Configuring Skaffold with Cloud Build

Here is where things get interesting. The `skaffold.yaml` file ties everything together.

```yaml
# skaffold.yaml - Pipeline config using Cloud Build for remote builds
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-app
build:
  googleCloudBuild:
    projectId: my-gcp-project
    # Use a machine with more CPU for faster builds
    machineType: E2_HIGHCPU_8
    # Timeout for the build step
    timeout: 600s
  artifacts:
    - image: us-central1-docker.pkg.dev/my-gcp-project/my-repo/my-app
      docker:
        dockerfile: Dockerfile
deploy:
  kubectl:
    manifests:
      - k8s/*.yaml
```

The `googleCloudBuild` section tells Skaffold to send your source code to Cloud Build instead of building locally. Cloud Build runs the Docker build on GCP infrastructure and pushes the resulting image to Artifact Registry.

## Running the Development Loop

With everything configured, start the dev loop.

```bash
# Start Skaffold in dev mode - watches for changes and auto-deploys
skaffold dev --default-repo=us-central1-docker.pkg.dev/my-gcp-project/my-repo
```

Skaffold will now:

1. Upload your source to Cloud Build
2. Build the Docker image remotely
3. Push the image to Artifact Registry
4. Deploy to your GKE cluster
5. Stream logs from the running pod back to your terminal

When you edit `main.go` and save, Skaffold detects the change and repeats the entire cycle automatically. The feedback loop is usually 30-60 seconds depending on your build complexity.

## Speeding Things Up with File Sync

For interpreted languages or cases where you want faster iteration, Skaffold supports file sync. This copies changed files directly into running containers without rebuilding the image.

```yaml
# skaffold.yaml - With file sync for faster iteration
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-app
build:
  googleCloudBuild:
    projectId: my-gcp-project
  artifacts:
    - image: us-central1-docker.pkg.dev/my-gcp-project/my-repo/my-app
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          # Sync static assets without rebuilding
          - src: "static/**"
            dest: /app/static
deploy:
  kubectl:
    manifests:
      - k8s/*.yaml
```

This is especially useful for frontend assets or configuration files that do not require a rebuild.

## Using Profiles for Different Environments

One of the strongest Skaffold features is profiles. You can define different build and deploy configurations for local development versus CI/CD.

```yaml
# skaffold.yaml - With profiles for local and cloud builds
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: my-app
build:
  artifacts:
    - image: us-central1-docker.pkg.dev/my-gcp-project/my-repo/my-app
      docker:
        dockerfile: Dockerfile
deploy:
  kubectl:
    manifests:
      - k8s/*.yaml
profiles:
  # Use local Docker builds when developing
  - name: local
    build:
      local:
        push: false
  # Use Cloud Build for CI/CD or when you want remote builds
  - name: cloud
    build:
      googleCloudBuild:
        projectId: my-gcp-project
        machineType: E2_HIGHCPU_8
```

Activate a profile with the `-p` flag.

```bash
# Build locally during development
skaffold dev -p local

# Use Cloud Build for heavier workloads
skaffold dev -p cloud
```

## Integrating with Cloud Build Triggers

For production deployments, you probably want Cloud Build triggers rather than running Skaffold manually. You can use `skaffold run` inside a Cloud Build config.

```yaml
# cloudbuild.yaml - Use Skaffold inside Cloud Build for CI/CD
steps:
  - name: 'gcr.io/k8s-skaffold/skaffold:v2.10.0'
    entrypoint: 'skaffold'
    args:
      - 'run'
      - '--default-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo'
    env:
      - 'CLOUDSDK_COMPUTE_REGION=us-central1'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-dev-cluster'
```

This gives you a consistent pipeline. The same Skaffold config that works on your laptop also works in CI/CD.

## Debugging with Skaffold

Skaffold also has a debug mode that automatically configures debugging for your language runtime.

```bash
# Start Skaffold in debug mode - sets up remote debugging
skaffold debug --default-repo=us-central1-docker.pkg.dev/my-gcp-project/my-repo
```

For Go, it installs and configures Delve. For Java, it sets up JDWP. For Node.js, it enables the inspector. You can then connect your IDE's debugger to the remote port.

## Common Pitfalls

A few things I have run into while using this setup:

**Cloud Build permissions**: Make sure the Cloud Build service account has permission to push to Artifact Registry and deploy to GKE. You will need the `roles/artifactregistry.writer` and `roles/container.developer` roles.

**Image name matching**: The image name in your Kubernetes manifest must match the artifact name in `skaffold.yaml`. Skaffold uses this to know which image tags to inject.

**Artifact Registry authentication**: If you see authentication errors, run `gcloud auth configure-docker us-central1-docker.pkg.dev` to set up credential helpers.

## Wrapping Up

Skaffold with Cloud Build and GKE gives you a development workflow where the gap between local development and production deployment is minimal. You define your pipeline once in `skaffold.yaml`, use `skaffold dev` for fast iteration, and `skaffold run` for production deploys. Cloud Build handles the heavy lifting of image builds, and GKE provides a consistent Kubernetes environment across all stages.

The real win here is consistency. The same tools and configurations work from your laptop all the way to production, which means fewer surprises when code ships.
