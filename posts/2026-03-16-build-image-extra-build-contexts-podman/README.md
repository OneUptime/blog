# How to Build an Image with Extra Build Contexts with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Containerfile

Description: Learn how to use extra build contexts in Podman to reference external sources, other images, or local directories during your container image builds.

---

> Extra build contexts let you pull files from multiple sources into a single build, keeping your Containerfiles clean and modular.

When building container images, you sometimes need files from directories outside your primary build context. Podman supports the `--build-context` flag, which allows you to define additional named contexts that can be referenced inside your Containerfile. This is useful for sharing common configuration files, pulling binaries from other images, or organizing monorepo builds.

---

## Understanding Build Contexts

By default, Podman uses the directory you specify in the `podman build` command as the build context. Every `COPY` or `ADD` instruction pulls files from this single directory. With extra build contexts, you can define named references to other directories or even other container images.

## Basic Syntax

The `--build-context` flag follows this pattern:

```bash
# General syntax

podman build --build-context <name>=<source> -t <image-name> .
```

The `<source>` can be:
- A local directory path
- A container image reference (prefixed with `container-image://`; `docker-image://` is also accepted)
- A URL to a tarball

## Using a Local Directory as an Extra Context

Suppose you have shared configuration files in a separate directory. You can reference them in your build without copying them into your main build context.

```bash
# Project structure
# /projects/myapp/        <- main build context
# /projects/shared-config/ <- extra context with shared configs

# Create a Containerfile in the main build context that references the extra context
cat > /projects/myapp/Containerfile <<'EOF'
FROM alpine:3.23

# Copy from the main build context as usual
COPY app.sh /usr/local/bin/app.sh

# Copy from the named extra context "configs"
COPY --from=configs nginx.conf /etc/nginx/nginx.conf

RUN chmod +x /usr/local/bin/app.sh
CMD ["/usr/local/bin/app.sh"]
EOF

# Build with the extra context
podman build \
  --build-context configs=/projects/shared-config \
  -t myapp:latest \
  /projects/myapp/
```

The `--from=configs` in the `COPY` instruction tells Podman to pull the file from the named context `configs` instead of the default build context.

## Using Another Image as an Extra Context

You can reference an existing container image as an extra build context. This is helpful when you want to copy pre-built binaries or assets from a published image.

```bash
# Use an official golang image as a named context
podman build \
  --build-context gotools=container-image://golang:1.26-alpine \
  -t myapp:latest .
```

In your Containerfile, reference it like this:

```dockerfile
FROM alpine:3.23

# Copy the Go binary from the gotools context
COPY --from=gotools /usr/local/go/bin/go /usr/local/bin/go

CMD ["go", "version"]
```

## Multiple Extra Contexts

You can specify multiple `--build-context` flags in a single build command.

```bash
# Build with multiple extra contexts
podman build \
  --build-context configs=/projects/shared-config \
  --build-context scripts=/projects/shared-scripts \
  --build-context base=container-image://ubuntu:24.04 \
  -t myapp:latest .
```

Then reference each one in your Containerfile:

```dockerfile
FROM alpine:3.23

COPY --from=configs app.conf /etc/app/
COPY --from=scripts entrypoint.sh /usr/local/bin/
COPY --from=base /etc/ssl/certs/ /etc/ssl/certs/

CMD ["/usr/local/bin/entrypoint.sh"]
```

## Overriding a Stage Name

A powerful pattern is to override a named build stage. If your Containerfile uses a multi-stage build, you can replace one of those stages with an external context.

```dockerfile
# Containerfile with a named stage
FROM golang:1.26 AS builder
WORKDIR /src
COPY . .
RUN go build -o /app

FROM alpine:3.23
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
```

You can override the `builder` stage with a local directory that already contains the compiled binary:

```bash
# Skip the build stage entirely by providing a pre-built context
podman build \
  --build-context builder=/path/to/prebuilt-binaries \
  -t myapp:latest .
```

This is extremely useful in CI/CD pipelines where you may have already compiled artifacts in a previous step.

## Practical Example: Monorepo Build

In a monorepo, different services might share libraries or configuration. Extra build contexts keep things organized.

```bash
# Monorepo structure
# /repo/services/api/
# /repo/services/web/
# /repo/libs/common/
# /repo/configs/

# Build the API service with shared libs and configs
podman build \
  --build-context common=/repo/libs/common \
  --build-context configs=/repo/configs \
  -f /repo/services/api/Containerfile \
  -t api-service:latest \
  /repo/services/api/
```

```dockerfile
# /repo/services/api/Containerfile
FROM node:24-alpine

WORKDIR /app
COPY package.json .
RUN npm install

# Copy shared library from extra context
COPY --from=common . /app/libs/common/

# Copy shared config
COPY --from=configs api.json /app/config/

COPY . .
CMD ["node", "index.js"]
```

## Verifying the Build

After building, inspect the image to confirm files were copied correctly:

```bash
# Run the image and check that files exist
podman run --rm myapp:latest ls -la /etc/app/
podman run --rm myapp:latest cat /app/config/api.json
```

## Summary

Extra build contexts in Podman give you flexibility to reference multiple directories and images during a build. They help keep your Containerfiles modular, support monorepo workflows, and allow you to override build stages with pre-built artifacts. Use the `--build-context` flag alongside `COPY --from=` to pull files from any named context.
