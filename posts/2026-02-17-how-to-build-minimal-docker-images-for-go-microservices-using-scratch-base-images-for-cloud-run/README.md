# How to Build Minimal Docker Images for Go Microservices Using Scratch Base Images for Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Go, Docker, Cloud Run, Scratch Image, Microservices, Container

Description: Learn how to build extremely small Docker images for Go microservices using scratch base images and deploy them to Google Cloud Run.

---

Go has a superpower that most languages do not: it compiles to a single static binary with zero runtime dependencies. This means you can put a Go binary in a Docker image that contains literally nothing else - no operating system, no shell, no package manager. Just your binary.

This is what the `scratch` base image gives you. It is an empty image, zero bytes, a blank canvas. When you copy a statically compiled Go binary into a scratch image, you end up with a Docker image that is typically 5-15MB. Compare that to an image based on Ubuntu (70MB+) or even Alpine (5MB base + your app).

For Cloud Run, where you pay per request and cold starts matter, a tiny image means faster pulls, faster startup, and lower costs.

## Building a Static Go Binary

The key to making scratch images work is building a fully static binary. By default, Go links against some C libraries (like DNS resolution). You need to disable CGO for a pure Go binary.

Here is a simple HTTP server.

```go
// main.go - A simple HTTP microservice for Cloud Run
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"
)

// Response holds our JSON response structure
type Response struct {
    Message   string `json:"message"`
    Timestamp string `json:"timestamp"`
    Service   string `json:"service"`
}

func main() {
    // Cloud Run sets the PORT environment variable
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    http.HandleFunc("/", handleRoot)
    http.HandleFunc("/health", handleHealth)

    log.Printf("Starting server on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
    resp := Response{
        Message:   "Hello from a scratch-based container!",
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Service:   "my-go-service",
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
}
```

## The Multi-Stage Dockerfile

Here is the Dockerfile that builds this into a scratch-based image.

```dockerfile
# Stage 1: Build the static binary
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go module files first for dependency caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a statically linked binary
# CGO_ENABLED=0 ensures no C dependencies
# -ldflags="-s -w" strips debug info to reduce binary size
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/server \
    main.go

# Stage 2: Create the minimal runtime image
FROM scratch

# Copy CA certificates so the app can make HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data so time.LoadLocation works
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /app/server /server

# Cloud Run listens on this port
EXPOSE 8080

# Run the binary
ENTRYPOINT ["/server"]
```

A few things to note about this Dockerfile:

**CA certificates**: Without these, your application cannot make HTTPS requests to external services. Scratch has no certificates at all, so we copy them from the builder stage.

**Timezone data**: If your application uses `time.LoadLocation()` or similar functions, you need timezone data. Without it, you will get runtime panics.

**Binary stripping**: The `-ldflags="-s -w"` flags strip the symbol table and debug information. This can reduce binary size by 20-30%.

## Building and Deploying to Cloud Run

Build the image and push it to Artifact Registry.

```bash
# Build the image
docker build -t us-central1-docker.pkg.dev/my-project/my-repo/go-service:v1 .

# Check the image size
docker images us-central1-docker.pkg.dev/my-project/my-repo/go-service:v1
# REPOSITORY   TAG   IMAGE ID   CREATED   SIZE
# ...          v1    abc123     ...       8.2MB

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/my-repo/go-service:v1
```

Deploy to Cloud Run.

```bash
# Deploy with minimal resources since the image is tiny
gcloud run deploy go-service \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/go-service:v1 \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --memory=128Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=100 \
    --port=8080
```

Notice the `--memory=128Mi`. Go applications compiled statically use very little memory. A simple web server like this will use about 10-20MB at runtime.

## Making It Even Smaller with UPX

If you want to squeeze every last byte, you can compress the binary with UPX (Ultimate Packer for Executables).

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder

# Install UPX for binary compression
RUN apk add --no-cache upx

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/server \
    main.go

# Compress the binary - reduces size by ~60%
RUN upx --best --lzma /app/server

# Stage 2: Scratch runtime
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

UPX can reduce the binary from 8MB to about 3MB. The tradeoff is slightly slower startup time as the binary decompresses, but we are talking milliseconds.

## Handling Common Scratch Image Challenges

Working with scratch images comes with a few challenges you should know about.

### No Shell

You cannot exec into a scratch container. There is no shell, no `ls`, no `cat`. If you need to debug, you have a couple of options.

One approach is to use a debug build target.

```dockerfile
# Add a debug stage for troubleshooting
FROM alpine:3.19 AS debug
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
RUN apk add --no-cache curl
EXPOSE 8080
ENTRYPOINT ["/server"]
```

Build the debug version when you need it.

```bash
# Build with the debug target for troubleshooting
docker build --target debug -t my-app:debug .
```

### No User Management

Scratch has no `/etc/passwd` file. If you want to run as a non-root user (which is a good security practice), you need to create the user file in the builder stage.

```dockerfile
FROM golang:1.22-alpine AS builder
# Create a non-root user
RUN echo "appuser:x:65534:65534:App User:/:" > /etc/passwd.app

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app/server main.go

FROM scratch
# Copy the passwd file and set the user
COPY --from=builder /etc/passwd.app /etc/passwd
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server
USER appuser
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### DNS Resolution

Go's pure Go DNS resolver works fine in scratch containers. However, if you need CGO for any reason (like using SQLite), you cannot use scratch. In that case, use distroless instead.

```dockerfile
# Alternative: Distroless for when you need some system libraries
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

Distroless adds only about 2MB to the image size but includes CA certificates, timezone data, and basic system files.

## Image Size Comparison

Here is a comparison of the same Go application built with different base images:

- `golang:1.22` (build image left in): ~850MB
- `ubuntu:22.04` base: ~85MB
- `alpine:3.19` base: ~13MB
- `gcr.io/distroless/static`: ~9MB
- `scratch`: ~7MB
- `scratch` + UPX: ~3MB

## Cloud Build Integration

Here is a Cloud Build configuration for automated builds.

```yaml
# cloudbuild.yaml - Build minimal Go image with Cloud Build
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/go-service:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/go-service:latest'
      - '.'
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/go-service:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/go-service:latest'
```

## Wrapping Up

Scratch-based Docker images for Go microservices are about as lean as container images get. A 7MB image that starts in under a second is ideal for Cloud Run where you want fast cold starts, minimal attack surface, and low storage costs. The main thing to remember is to copy CA certificates and timezone data from the builder stage, and to build your Go binary with `CGO_ENABLED=0` for full static linking.
