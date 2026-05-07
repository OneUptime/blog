# How to Create a Distroless Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Distroless, Container Security, Containerfile, DevOps

Description: Learn how to create minimal, secure distroless container images with Podman by removing everything except your application and its runtime dependencies.

---

> Distroless images strip away the traditional Linux distribution contents and keep only your application, dramatically reducing your attack surface and image size.

Traditional container images include a full Linux distribution with package managers, shells, and utilities that your application never uses in production. Distroless images take a different approach by including only the application and its runtime dependencies, nothing else. No shell, no package manager, no unnecessary libraries. This guide shows you how to build distroless images with Podman for various languages and runtimes.

---

## What Are Distroless Images?

Distroless images are container images that contain only the application binary, its runtime dependencies, and essential system files like CA certificates and timezone data. They do not include a shell (`/bin/sh`), package manager (`apt`, `apk`), or any other system utilities.

The benefits are significant. The attack surface is dramatically reduced because there are no tools an attacker could use if they gained access to the container. Image sizes are smaller because unnecessary packages are excluded. Compliance is simpler because there are fewer packages to scan and patch. The images also enforce best practices by making it impossible to SSH into containers or run ad-hoc commands.

## Google's Distroless Images

Google maintains a set of distroless base images at `gcr.io/distroless/`. These are the most popular distroless images and cover common runtimes:

- `gcr.io/distroless/static-debian13` for statically compiled binaries
- `gcr.io/distroless/base-debian13` for dynamically linked binaries that need glibc
- `gcr.io/distroless/java21-debian13` for Java applications
- `gcr.io/distroless/nodejs22-debian13` for Node.js applications
- `gcr.io/distroless/python3-debian13` for Python applications

Each image also has a `-nonroot` variant that runs as a non-root user by default.

## Go Application with Distroless

Go is the ideal language for distroless images because it can produce statically linked binaries when CGO is disabled. Here is a complete example:

```dockerfile
# Build stage

FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /server ./cmd/server

# Runtime stage - distroless
FROM gcr.io/distroless/static-debian13:nonroot

COPY --from=builder /server /server

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/server"]
```

Build and run with Podman:

```bash
podman build -t go-distroless .
podman run -d -p 8080:8080 go-distroless
```

Check the image size:

```bash
podman images go-distroless
```

The resulting image will typically be under 15 MB, compared to hundreds of megabytes for a full Go image.

## Java Application with Distroless

Java applications need a JRE, which the Java distroless image provides:

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

# Runtime stage - distroless
FROM gcr.io/distroless/java21-debian13:nonroot

COPY --from=builder /app/target/app.jar /app.jar

EXPOSE 8080

USER nonroot:nonroot

CMD ["/app.jar"]
```

The distroless Java image includes the JRE and required native libraries but nothing else. You cannot shell into this container or install debugging tools at runtime.

## Node.js Application with Distroless

Node.js applications need the Node.js runtime:

```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Runtime stage - distroless
FROM gcr.io/distroless/nodejs22-debian13:nonroot

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 3000

USER nonroot:nonroot

CMD ["server.js"]
```

Note that with the Node.js distroless image, the CMD only specifies the script name because the `node` binary is already the entrypoint.

## Python Application with Distroless

Python distroless images require extra care since Python applications often have native dependencies:

```dockerfile
# Build stage
FROM python:3.13-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --target=/app/deps -r requirements.txt

COPY . .

# Runtime stage - distroless
FROM gcr.io/distroless/python3-debian13:nonroot

WORKDIR /app

COPY --from=builder /app /app

ENV PYTHONPATH=/app/deps

EXPOSE 8000

USER nonroot:nonroot

CMD ["/app/main.py"]
```

The key is installing Python packages into a target directory and then copying them to the distroless image. Set PYTHONPATH so Python can find the installed packages.

## Rust Application with Distroless

Like Go, Rust can produce statically linked binaries, making it an excellent fit for distroless:

```dockerfile
FROM rust:1.94-slim-trixie AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN apt-get update && apt-get install -y musl-tools && \
    rustup target add x86_64-unknown-linux-musl && \
    cargo build --release --target x86_64-unknown-linux-musl

FROM gcr.io/distroless/static-debian13:nonroot

COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/myapp /myapp

USER nonroot:nonroot

ENTRYPOINT ["/myapp"]
```

Building with the musl target ensures the binary is fully statically linked and does not need glibc.

## Debugging Distroless Containers

Since distroless images have no shell, traditional debugging approaches do not work. You cannot `podman exec -it container /bin/sh`. Instead, use these techniques:

**Debug images:** Google provides debug variants that include a shell:

```bash
# Use the debug variant for troubleshooting (not production)
podman run -it --entrypoint=sh gcr.io/distroless/base-debian13:debug
```

**Ephemeral containers with Podman:** You can attach a debug container to the same network namespace:

```bash
# Run a debug container with access to the app container's network
podman run --rm -it --network container:my-app alpine sh
```

**Application-level debugging:** Build observability into your application with structured logging, health check endpoints, and metrics:

```go
import (
    "log/slog"
    "net/http"
)

func main() {
    logger := slog.Default()

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"healthy"}`))
    })

    http.HandleFunc("/debug/info", func(w http.ResponseWriter, r *http.Request) {
        // Return application state for debugging
    })

    logger.Info("server starting", "port", 8080)
    http.ListenAndServe(":8080", nil)
}
```

## Security Scanning Distroless Images

One of the benefits of distroless is a dramatically smaller vulnerability surface. Compare scan results:

```bash
# Scan a regular image
podman run --rm aquasec/trivy image node:22

# Scan a distroless image
podman run --rm aquasec/trivy image gcr.io/distroless/nodejs22-debian13
```

The distroless image will have far fewer CVEs because it contains far fewer packages.

## Building Your Own Distroless-Style Image

You can create your own minimal images without using Google's distroless base by starting from scratch and adding only what you need:

```dockerfile
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM scratch

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy passwd for non-root user
COPY --from=builder /etc/passwd /etc/passwd

# Copy the binary
COPY --from=builder /server /server

USER nobody

ENTRYPOINT ["/server"]
```

This approach gives you complete control over what goes into the image.

## Best Practices

Always use multi-stage builds with distroless images. The build stage includes all tooling, and the final stage is distroless. Use the nonroot variants for an additional layer of security. Pin your distroless base images to specific digests for reproducible builds. Implement application-level health checks and debugging endpoints since you cannot shell into the container. Use debug image variants during development and testing, but never in production. Scan your distroless images regularly even though they have fewer vulnerabilities. Test your application thoroughly in distroless containers since missing libraries or files will cause runtime failures rather than build failures.

## Conclusion

Distroless images represent the minimal viable container: just your application and what it needs to run. By stripping away the traditional distribution layer, you get smaller images, a reduced attack surface, and cleaner security scans. The trade-off is reduced debuggability at runtime, which you mitigate through application-level observability and debug image variants. For production workloads where security matters, distroless should be your default choice.
