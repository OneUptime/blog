# How to Use WORKDIR Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, WORKDIR, Container Image, DevOps

Description: Learn how to use the WORKDIR instruction in Podman Containerfiles to set the working directory for your container builds and runtime, with best practices and common patterns.

---

> The WORKDIR instruction sets the working directory for all subsequent instructions in your Containerfile. Using it correctly keeps your builds organized, readable, and less error-prone.

The WORKDIR instruction in a Containerfile sets the working directory for any RUN, CMD, ENTRYPOINT, COPY, and ADD instructions that follow it. While it might seem like a simple directive, using WORKDIR properly is an important part of writing clean, maintainable Containerfiles. It provides structure, prevents path-related bugs, and makes your container images more predictable.

This guide covers everything you need to know about WORKDIR in Podman Containerfiles, from basic usage to advanced patterns and common pitfalls.

---

## Basic Syntax

The WORKDIR instruction takes a single argument: the path to set as the working directory.

```dockerfile
WORKDIR /path/to/directory
```

If the directory does not exist, WORKDIR creates it automatically. You do not need a separate RUN mkdir command.

```dockerfile
FROM alpine:3.19

# This creates /app if it doesn't exist and sets it as the working directory

WORKDIR /app

# All subsequent instructions run relative to /app
COPY . .
RUN ls -la
```

## Why WORKDIR Matters

Without WORKDIR, you might be tempted to use `cd` inside RUN instructions. This is a common mistake because `cd` only affects the current RUN instruction's shell session.

```dockerfile
# Bad: cd doesn't persist across RUN instructions
FROM python:3.12-slim

RUN mkdir -p /app && cd /app && pwd  # Outputs /app, but only for this line
RUN pwd  # Outputs /

# Good: WORKDIR persists for all subsequent instructions
FROM python:3.12-slim

WORKDIR /app
RUN pwd     # Outputs /app
COPY . .    # Copies to /app
RUN pwd     # Still runs in /app
```

WORKDIR also sets the default directory where commands run when you start the container:

```bash
# If the image does not set WORKDIR, the default directory is /
podman run myapp pwd
# Output: /

# With WORKDIR /app, the container starts in /app
podman run myapp-with-workdir pwd
# Output: /app
```

## Using WORKDIR with Relative Paths

WORKDIR supports both absolute and relative paths. Relative paths are resolved relative to the previous WORKDIR:

```dockerfile
FROM node:20-alpine

WORKDIR /app          # Current directory: /app
WORKDIR src           # Current directory: /app/src
WORKDIR ../config     # Current directory: /app/config

COPY settings.json .  # Copies to /app/config/settings.json
```

While relative paths work, it is generally better to use absolute paths for clarity:

```dockerfile
# Clearer with absolute paths
FROM node:20-alpine

WORKDIR /app/src
COPY *.ts .

WORKDIR /app/config
COPY settings.json .
```

## WORKDIR with Environment Variables

WORKDIR supports environment variable expansion using variables defined with ENV:

```dockerfile
FROM python:3.12-slim

ENV APP_HOME=/opt/myapp

WORKDIR ${APP_HOME}

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "app.py"]
```

This is useful when you want to make the application directory configurable or when you follow organizational conventions:

```dockerfile
FROM node:20-alpine

ENV APP_DIR=/srv/app
ENV LOG_DIR=/var/log/app

WORKDIR ${APP_DIR}
COPY . .
RUN npm ci

RUN mkdir -p ${LOG_DIR}

CMD ["node", "server.js"]
```

Note that ARG variables can also be used with WORKDIR after they are declared. The difference is that ARG values are only available during build time and follow build-stage scoping rules, while ENV values persist in the final image.

## Multiple WORKDIR Instructions

You can use WORKDIR multiple times in a Containerfile. Each one changes the working directory for all subsequent instructions until the next WORKDIR:

```dockerfile
FROM python:3.12-slim

# Install dependencies in /app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
WORKDIR /app/src
COPY src/ .

# Copy configuration
WORKDIR /app/config
COPY config/ .

# Set the final working directory for runtime
WORKDIR /app
CMD ["python", "src/main.py"]
```

## WORKDIR in Multi-Stage Builds

Each build stage has its own working directory context. WORKDIR settings from one stage do not carry over to another:

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server .

# Runtime stage - starts fresh, default is /
FROM alpine:3.19

# Must set WORKDIR again
WORKDIR /app
COPY --from=builder /build/server .

USER 1001
CMD ["./server"]
```

## Common Patterns

### Pattern 1: Web Application

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
COPY . .
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Pattern 2: Microservice with Separate Concerns

```dockerfile
FROM python:3.12-slim

# Application code
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/

# Static files
WORKDIR /app/static
COPY static/ .

# Configuration
WORKDIR /app/config
COPY config/default.yaml .

# Migrations
WORKDIR /app/migrations
COPY migrations/ .

# Return to app root for runtime
WORKDIR /app

USER 1001
CMD ["python", "src/main.py"]
```

### Pattern 3: Development Container

```dockerfile
FROM python:3.12

# System tools
WORKDIR /usr/local/bin
COPY scripts/dev-tools.sh .
RUN chmod +x dev-tools.sh && ./dev-tools.sh

# Application workspace
WORKDIR /workspace

# Install dependencies but don't copy source (mounted at runtime)
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# /workspace is where the source code will be mounted
CMD ["python", "app.py"]
```

### Pattern 4: Multi-Component Application

```dockerfile
FROM node:20-alpine AS frontend

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM golang:1.22-alpine AS backend

WORKDIR /backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -o api-server .

FROM alpine:3.19

WORKDIR /app

# Copy built artifacts from both stages
COPY --from=backend /backend/api-server .
COPY --from=frontend /frontend/dist ./public/

USER 1001
EXPOSE 8080
CMD ["./api-server"]
```

## WORKDIR and File Permissions

When WORKDIR creates a directory, it is created with default permissions (typically 755) and owned by root. If you need different permissions, set them explicitly:

```dockerfile
FROM node:20-alpine

# Create working directory with specific ownership
RUN mkdir -p /app && chown node:node /app

WORKDIR /app

# Files copied here will be in a directory owned by node
COPY --chown=node:node . .

USER node
CMD ["node", "server.js"]
```

## Common Mistakes

```dockerfile
# Mistake 1: Using cd instead of WORKDIR
RUN cd /app && npm install
RUN npm start  # FAILS: not in /app anymore

# Mistake 2: Relying on RUN mkdir when WORKDIR creates it
RUN mkdir -p /app  # Unnecessary
WORKDIR /app       # Creates /app if it doesn't exist

# Mistake 3: Forgetting WORKDIR in the runtime stage
FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY . .
RUN go build -o server .

FROM alpine:3.19
# Forgot WORKDIR, so COPY goes to / and CMD runs in /
COPY --from=builder /build/server .
CMD ["./server"]  # Works, but messy

# Mistake 4: Using WORKDIR with trailing operations
WORKDIR /app/
COPY . /app/  # Redundant path, just use .
# Better:
WORKDIR /app
COPY . .

# Mistake 5: Changing WORKDIR unnecessarily
WORKDIR /app
COPY package.json .
WORKDIR /app        # Redundant, already there
RUN npm install
```

## Best Practices Summary

Here is a checklist for using WORKDIR effectively:

```dockerfile
FROM node:20-alpine

# 1. Set WORKDIR early in the Containerfile
WORKDIR /app

# 2. Use absolute paths for clarity
# WORKDIR /app (not WORKDIR app)

# 3. Let WORKDIR create directories (don't use mkdir)
# No need for: RUN mkdir -p /app

# 4. Use . in COPY/ADD after WORKDIR is set
COPY package.json .
RUN npm ci
COPY . .

# 5. Set a final WORKDIR for the runtime context
# Already set to /app

# 6. Use ENV for configurable paths
# ENV APP_HOME=/app
# WORKDIR ${APP_HOME}

USER node
CMD ["node", "server.js"]
```

## Conclusion

The WORKDIR instruction is a small but essential part of writing clean Containerfiles. It sets the context for all file operations and command execution, creates directories automatically, and ensures your container starts in the right place. Use absolute paths, set WORKDIR early, and remember that it persists across all subsequent instructions. By following these practices, you will write Containerfiles that are easier to read, maintain, and debug, whether you are building a simple single-stage image or a complex multi-stage pipeline with Podman.
