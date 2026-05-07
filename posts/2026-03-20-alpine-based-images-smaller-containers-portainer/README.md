# How to Use Alpine-Based Images for Smaller Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Alpine Linux, Container Optimization, DevOps, Image

Description: Learn how to use Alpine Linux-based Docker images to dramatically reduce container size and deploy them efficiently through Portainer.

---

Alpine Linux is a security-oriented, lightweight Linux distribution that produces Docker images as small as 5 MB. Switching from full distributions like Ubuntu or Debian to Alpine can significantly reduce image sizes, speeding up pulls and reducing your attack surface.

---

## Why Alpine Images Are Smaller

| Base Image       | Approx Compressed Size (linux/amd64) |
|------------------|--------------------------------------|
| ubuntu:22.04     | ~28 MB                               |
| debian:bookworm  | ~46 MB                               |
| alpine:3.23      | ~4 MB                                |

Alpine uses `musl libc` and `busybox` instead of `glibc` and GNU coreutils, keeping the footprint minimal.

---

## Write an Alpine-Based Dockerfile

```dockerfile
# Use Alpine as the base

FROM alpine:3.23

# Install only what you need
RUN apk add --no-cache \
    curl \
    ca-certificates

# Copy a statically linked or musl-compatible application binary
COPY myapp /usr/local/bin/myapp
RUN chmod +x /usr/local/bin/myapp

EXPOSE 8080
CMD ["myapp"]
```

---

## Multi-Stage Build with Alpine

```dockerfile
# Build stage
FROM golang:1.26-alpine3.23 AS builder
WORKDIR /app
COPY . .
RUN go build -o server .

# Runtime stage - minimal Alpine
FROM alpine:3.23
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/server /usr/local/bin/server
EXPOSE 8080
CMD ["server"]
```

This pattern produces a final image with only the compiled binary and runtime dependencies.

---

## Deploy the Alpine Image in Portainer

1. Navigate to **Images** in the Portainer sidebar.
2. Click **Pull image** and enter `alpine:3.23` (or your custom image tag).
3. Go to **Containers** → **Add container**.
4. Set the image to your Alpine-based image.
5. Configure ports, volumes, and environment variables.
6. Click **Deploy the container**.

---

## Using Alpine in a Portainer Stack (Docker Compose)

```yaml
services:
  app:
    image: myorg/myapp:alpine
    ports:
      - "8080:8080"
    restart: unless-stopped
    environment:
      - ENV=production
```

Deploy via **Stacks** → **Add stack** in Portainer.

---

## Package Management on Alpine

```bash
# Alpine uses apk instead of apt
apk add --no-cache nginx
apk del nginx
apk update && apk search python3
apk info
```

---

## Summary

Alpine-based images shrink container sizes significantly, reducing pull times and the attack surface. Use `FROM alpine:3.23` as your base, install only necessary packages with `apk add --no-cache`, and combine with multi-stage builds for the leanest possible production images. Deploy and manage Alpine containers through Portainer's UI or stack definitions.
