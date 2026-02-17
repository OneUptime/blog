# How to Create a Multi-Architecture Docker Build for ARM and x86 Using Cloud Build and Deploy to GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Docker, Multi-Architecture, Cloud Build, GKE, ARM, Container

Description: Learn how to build multi-architecture Docker images supporting ARM and x86 using Google Cloud Build and deploy them to GKE clusters with mixed node pools.

---

ARM-based compute is becoming increasingly common. GKE now offers Tau T2A instances powered by Arm processors, and they provide better price-performance for many workloads. But if your Docker images only support x86 (amd64), they will not run on ARM nodes.

Multi-architecture Docker images solve this problem. A single image tag contains variants for both amd64 and arm64. When a node pulls the image, Docker automatically selects the right variant for that architecture. This means the same deployment manifest works on x86 nodes, ARM nodes, or a mixed cluster.

## How Multi-Arch Images Work

A multi-arch image is actually a manifest list that points to multiple platform-specific images. When you push a multi-arch image to a registry, it stores:

- A manifest list (sometimes called a fat manifest)
- An amd64 image
- An arm64 image

When a Kubernetes node with arm64 architecture pulls the image, Docker resolves the manifest list and downloads only the arm64 variant.

## Preparing Your Application

Most applications work on both architectures without code changes. The key is the Dockerfile. You need to make sure your base images support both architectures and that you are not hardcoding architecture-specific paths.

Here is a Go application as an example (Go is great for multi-arch because cross-compilation is built in).

```go
// main.go - Simple web server that reports its architecture
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "runtime"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        hostname, _ := os.Hostname()
        fmt.Fprintf(w, "Architecture: %s/%s\nHostname: %s\n",
            runtime.GOOS, runtime.GOARCH, hostname)
    })
    log.Println("Starting server on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

And the Dockerfile.

```dockerfile
# Dockerfile - Multi-architecture compatible
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
# Let Go handle cross-compilation
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server main.go

FROM alpine:3.19
COPY --from=builder /server /server
EXPOSE 8080
CMD ["/server"]
```

Both `golang:1.22-alpine` and `alpine:3.19` support multiple architectures, so this Dockerfile works for both amd64 and arm64.

## Building Multi-Arch Images with Cloud Build

Cloud Build does not natively support multi-arch builds in a single step, but you can use Docker Buildx with QEMU emulation to build for multiple platforms.

```yaml
# cloudbuild.yaml - Multi-architecture build with Buildx
steps:
  # Set up QEMU for cross-architecture emulation
  - name: 'gcr.io/cloud-builders/docker'
    id: 'setup-qemu'
    args:
      - 'run'
      - '--privileged'
      - 'multiarch/qemu-user-static'
      - '--reset'
      - '-p'
      - 'yes'

  # Create a Buildx builder instance
  - name: 'gcr.io/cloud-builders/docker'
    id: 'create-builder'
    args:
      - 'buildx'
      - 'create'
      - '--name'
      - 'multiarch-builder'
      - '--driver'
      - 'docker-container'
      - '--use'

  # Build and push multi-arch image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-multiarch'
    args:
      - 'buildx'
      - 'build'
      - '--platform'
      - 'linux/amd64,linux/arm64'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '--push'
      - '.'

options:
  # Buildx needs more resources
  machineType: 'E2_HIGHCPU_8'
```

## Building Each Architecture Separately

If emulation is too slow, you can build each architecture natively and then combine them into a manifest list.

```yaml
# cloudbuild.yaml - Build architectures separately and combine
steps:
  # Build amd64 image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-amd64'
    args:
      - 'build'
      - '--platform'
      - 'linux/amd64'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-amd64'
      - '.'

  # Push amd64 image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-amd64'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-amd64'

  # Build arm64 image using QEMU emulation
  - name: 'gcr.io/cloud-builders/docker'
    id: 'setup-qemu'
    args: ['run', '--privileged', 'multiarch/qemu-user-static', '--reset', '-p', 'yes']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-arm64'
    args:
      - 'build'
      - '--platform'
      - 'linux/arm64'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-arm64'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    id: 'push-arm64'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-arm64'

  # Create and push the multi-arch manifest
  - name: 'gcr.io/cloud-builders/docker'
    id: 'create-manifest'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker manifest create \
          us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA \
          us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-amd64 \
          us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-arm64

        docker manifest push \
          us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-amd64'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA-arm64'
```

## Setting Up a Mixed-Architecture GKE Cluster

Create a GKE cluster with both x86 and ARM node pools.

```bash
# Create the cluster with an x86 node pool
gcloud container clusters create mixed-arch-cluster \
    --region=us-central1 \
    --machine-type=e2-standard-4 \
    --num-nodes=2

# Add an ARM node pool
gcloud container node-pools create arm-pool \
    --cluster=mixed-arch-cluster \
    --region=us-central1 \
    --machine-type=t2a-standard-4 \
    --num-nodes=2
```

The T2A machine type is Google's ARM-based offering. Kubernetes automatically labels these nodes with `kubernetes.io/arch=arm64`.

## Deploying to Mixed Architecture

With multi-arch images, you do not need to change your deployment manifests. The container runtime pulls the correct architecture variant automatically.

```yaml
# k8s/deployment.yaml - Works on both x86 and ARM nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 4
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
          image: us-central1-docker.pkg.dev/my-project/my-repo/my-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
      # Optional: spread pods across both architectures
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/arch
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: my-app
```

The `topologySpreadConstraints` section ensures pods are distributed across both x86 and ARM nodes.

## Verifying the Multi-Arch Image

After building, verify that the manifest list contains both architectures.

```bash
# Inspect the manifest list
docker manifest inspect \
    us-central1-docker.pkg.dev/my-project/my-repo/my-app:latest

# Or use crane for a cleaner view
crane manifest us-central1-docker.pkg.dev/my-project/my-repo/my-app:latest | jq '.manifests[].platform'
```

You should see entries for both `amd64` and `arm64`.

## Language-Specific Considerations

**Go**: Cross-compilation is built in. Set `GOOS` and `GOARCH` and Go handles the rest. CGO must be disabled for cross-compilation.

**Node.js**: Works on both architectures out of the box. Watch out for native modules (like sharp or bcrypt) that compile architecture-specific binaries.

**Python**: Most pure Python packages work on both architectures. Compiled extensions (numpy, pandas) have ARM wheels available in recent versions.

**Java**: JVM-based applications work on both architectures. Make sure your base JRE image supports ARM (Eclipse Temurin does).

## Wrapping Up

Multi-architecture Docker images let you run the same workloads on both x86 and ARM nodes in GKE. The Buildx approach with Cloud Build handles the building, and GKE's scheduling automatically places pods on the right nodes. With ARM instances offering better price-performance for many workloads, supporting both architectures gives you flexibility to optimize costs without changing your application code.
