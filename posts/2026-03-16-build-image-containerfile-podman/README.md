# How to Build an Image from a Containerfile with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Containerfile

Description: Learn how to build container images from a Containerfile using Podman, covering syntax, best practices, and practical build examples.

---

> Containerfiles are the Podman and Buildah convention for defining reproducible container image builds.

A Containerfile uses the same syntax as a Dockerfile. Podman natively supports both `Containerfile` and `Dockerfile` names, but `Containerfile` is a common naming convention in Podman and Buildah workflows. This guide walks through creating and building images from Containerfiles with practical examples.

---

## What Is a Containerfile

A Containerfile is a text file containing instructions that Podman executes sequentially to build an image. Filesystem-changing instructions such as `RUN`, `COPY`, and `ADD` create image layers; metadata instructions update the image configuration and build history.

```bash
# Create a project directory

mkdir -p ~/myapp && cd ~/myapp
```

## Writing Your First Containerfile

Create a simple Containerfile that builds a custom Nginx image.

```bash
# Create the Containerfile
cat > Containerfile << 'EOF'
# Use the official Nginx base image
FROM docker.io/library/nginx:latest

# Set metadata
LABEL maintainer="dev@example.com"
LABEL version="1.0"

# Copy custom configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static files
COPY html/ /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Default command
CMD ["nginx", "-g", "daemon off;"]
EOF
```

```bash
# Create supporting files
mkdir -p html
echo "<h1>Hello from Podman</h1>" > html/index.html

cat > nginx.conf << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        location / {
            root /usr/share/nginx/html;
            index index.html;
        }
    }
}
EOF
```

## Building the Image

Use `podman build` to create the image from the Containerfile.

```bash
# Build the image (Podman looks for Containerfile by default)
podman build -t mywebapp:v1.0 .

# The dot (.) specifies the build context directory
```

Podman automatically detects a file named `Containerfile` or `Dockerfile` in the current directory. If you need to choose a specific file, pass it explicitly with `-f`.

## Containerfile Instructions Reference

Here is a practical Containerfile demonstrating the most common instructions.

```bash
cat > Containerfile << 'EOF'
# FROM: specifies the base image
FROM docker.io/library/python:3.12-slim

# ENV: set environment variables
ENV APP_HOME=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# WORKDIR: set the working directory
WORKDIR ${APP_HOME}

# RUN: execute commands during build
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# COPY: copy files from build context
COPY requirements.txt .

# RUN: install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# COPY: copy application code
COPY . .

# ARG: build-time variable
ARG BUILD_VERSION=dev
RUN echo "Build version: ${BUILD_VERSION}" > /app/version.txt

# EXPOSE: document the port
EXPOSE 8000

# USER: run as non-root
RUN useradd -m appuser
USER appuser

# HEALTHCHECK: define container health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# CMD: default command when container starts
CMD ["python", "main.py"]
EOF
```

## Building with Verbose Output

See detailed build progress with the `--log-level` flag.

```bash
# Build with debug output (--log-level is a global Podman flag)
podman --log-level debug build -t myapp:latest .

# Build a Docker-format image instead of the default OCI format
podman build --format docker -t myapp:latest .
```

## Verifying the Built Image

After building, verify the image was created correctly.

```bash
# List the image
podman images mywebapp

# Inspect the image configuration
podman inspect mywebapp:v1.0

# Check the image history to see layers
podman history mywebapp:v1.0

# Run the image to test
podman run -d --name test-webapp -p 8080:80 mywebapp:v1.0

# Test the running container
curl http://localhost:8080

# Clean up
podman stop test-webapp && podman rm test-webapp
```

## Best Practices for Containerfiles

Follow these practices to build efficient, secure images.

```bash
# Good: combine RUN commands to reduce layers
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest
RUN apk add --no-cache \
    curl \
    vim \
    git \
    && rm -rf /var/cache/apk/*
EOF

# Good: copy dependency files first for better caching
cat > Containerfile << 'EOF'
FROM docker.io/library/node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "server.js"]
EOF
```

```bash
# Build the optimized image
podman build -t optimized-app:latest .

# Check the image size
podman images optimized-app
```

## Building from a Subdirectory

You can keep Containerfiles in subdirectories and specify the build context.

```bash
# Project structure:
# myproject/
#   docker/
#     Containerfile
#   src/
#     app.py
#   requirements.txt

# Build using a Containerfile from a subdirectory
podman build -f docker/Containerfile -t myapp:latest .
```

## Summary

Containerfiles provide a declarative, reproducible way to build container images with Podman. They follow the same syntax as Dockerfiles but use the OCI-native naming convention. Structure your Containerfiles to take advantage of layer caching by ordering instructions from least to most frequently changing, and always verify your built images by running them.
