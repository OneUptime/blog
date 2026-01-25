# How to Use Docker Copy vs Add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Dockerfile, Best Practices, DevOps, Build Process

Description: Understand the differences between COPY and ADD in Dockerfiles, when to use each instruction, and why COPY is preferred for most use cases while ADD serves specific purposes.

---

Both COPY and ADD transfer files from your build context into the Docker image. They look similar but behave differently in important ways. Understanding these differences helps you write cleaner, more predictable Dockerfiles.

## Quick Comparison

| Feature | COPY | ADD |
|---------|------|-----|
| Copy local files | Yes | Yes |
| Copy directories | Yes | Yes |
| Change ownership | Yes (--chown) | Yes (--chown) |
| Extract tar archives | No | Yes (automatic) |
| Download from URLs | No | Yes |
| Predictable behavior | Yes | Depends on source |

## COPY: The Straightforward Choice

COPY does exactly what its name suggests. It copies files and directories from the build context to the image.

```dockerfile
# Copy a single file
COPY package.json /app/package.json

# Copy multiple files
COPY package.json package-lock.json /app/

# Copy entire directory contents
COPY src/ /app/src/

# Copy with wildcard patterns
COPY *.json /app/config/

# Copy and change ownership in one step
COPY --chown=node:node . /app/
```

### COPY Best Practices

```dockerfile
FROM node:20-slim

WORKDIR /app

# Copy dependency files first for better caching
# Changes to source code won't invalidate this layer
COPY package.json package-lock.json ./

# Install dependencies (cached if package files unchanged)
RUN npm ci

# Copy application source
COPY src/ ./src/

# Copy configuration files
COPY tsconfig.json ./

CMD ["node", "src/server.js"]
```

### Directory Behavior

```dockerfile
# Source directory contents are copied, not the directory itself
COPY src/ /app/
# Result: /app contains the contents of src/

# To preserve directory name, specify it in destination
COPY src/ /app/src/
# Result: /app/src contains the contents of src/

# Without trailing slash on destination, behavior differs
COPY src /app/src
# If /app/src exists as directory: copies contents into it
# If /app/src doesn't exist: creates it and copies contents
```

## ADD: Extra Features, Extra Complexity

ADD does everything COPY does, plus automatic tar extraction and URL downloading.

### Automatic Tar Extraction

```dockerfile
# ADD automatically extracts recognized archive formats
ADD archive.tar.gz /app/
# Result: Archive contents extracted to /app/

# Supported formats: tar, tar.gz, tar.bz2, tar.xz
# Note: .zip files are NOT auto-extracted

# Compare with COPY
COPY archive.tar.gz /app/
# Result: archive.tar.gz copied as-is to /app/
```

When you want the archive extracted:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Download and extract a release archive
ADD https://github.com/example/project/releases/v1.0.0.tar.gz /app/

# Or extract a local archive
ADD vendor-libs.tar.gz /app/libs/
```

When you want the archive preserved:

```dockerfile
# Use COPY to keep the archive intact
COPY archive.tar.gz /app/archive.tar.gz

# Or use ADD with a different destination format
ADD archive.tar.gz /app/myarchive.tar.gz
# This copies without extraction because destination has explicit filename
```

### URL Downloading

```dockerfile
# ADD can fetch files from URLs
ADD https://example.com/config.json /app/config.json

# The downloaded file has permissions 600
# You may need to fix permissions
ADD https://example.com/script.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/script.sh
```

**Why URL downloading is discouraged:**

```dockerfile
# Problem: No caching control, no checksum verification
ADD https://example.com/binary /usr/local/bin/binary

# Better approach: Use curl or wget for more control
RUN curl -fsSL https://example.com/binary -o /usr/local/bin/binary \
    && chmod +x /usr/local/bin/binary \
    && echo "expected-sha256 /usr/local/bin/binary" | sha256sum -c
```

The RUN approach allows checksum verification, better error handling, and combines with other commands to reduce layers.

## When to Use Each

### Use COPY When:

```dockerfile
# Copying source code
COPY src/ /app/src/

# Copying configuration files
COPY nginx.conf /etc/nginx/nginx.conf

# Copying package manifests
COPY package.json package-lock.json ./

# Copying scripts
COPY docker-entrypoint.sh /usr/local/bin/

# 99% of file copying operations
COPY . /app/
```

### Use ADD When:

```dockerfile
# Extracting a local tar archive
ADD app-v1.2.3.tar.gz /app/

# Extracting vendored dependencies from archive
ADD vendor.tar.gz /app/vendor/

# Legacy Dockerfiles that rely on URL downloading (migrate to RUN + curl)
```

## Common Patterns

### Multi-Stage Build with COPY --from

```dockerfile
# Build stage
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app

# COPY from another stage uses --from flag
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

CMD ["node", "dist/server.js"]
```

### Copying with Correct Permissions

```dockerfile
FROM node:20-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy files owned by the application user
COPY --chown=appuser:appuser package*.json ./
RUN npm ci

COPY --chown=appuser:appuser . .

USER appuser
CMD ["node", "server.js"]
```

### Handling .dockerignore

Both COPY and ADD respect `.dockerignore` patterns.

```bash
# .dockerignore
node_modules
.git
.env
*.log
Dockerfile
docker-compose.yml
```

```dockerfile
# This COPY excludes everything in .dockerignore
COPY . /app/
# node_modules, .git, .env, etc. are NOT copied
```

## The Unpredictability Problem with ADD

ADD's behavior depends on the source file type, which can cause surprises:

```dockerfile
# What happens here?
ADD myfile /app/

# If myfile is a tar.gz -> extracted
# If myfile is a regular file -> copied
# If myfile is a URL -> downloaded
# If myfile is a directory -> contents copied

# With COPY, behavior is always the same
COPY myfile /app/
# myfile is copied as-is, period
```

This unpredictability is why Docker best practices recommend COPY for most cases.

## Performance Considerations

```dockerfile
# Both create cache layers based on file checksums
# Identical behavior for caching purposes

# Layer caching tip: Order COPY commands by change frequency
COPY package.json package-lock.json ./
RUN npm ci

# Source code changes more often than dependencies
# Place it after dependency installation
COPY src/ ./src/
```

## Migration from ADD to COPY

If you have Dockerfiles using ADD, consider updating them:

```dockerfile
# Before: Using ADD for everything
ADD package.json /app/
ADD src/ /app/src/
ADD https://example.com/tool /usr/local/bin/tool
ADD archive.tar.gz /app/vendor/

# After: Appropriate instruction for each use case
COPY package.json /app/
COPY src/ /app/src/
RUN curl -fsSL https://example.com/tool -o /usr/local/bin/tool \
    && chmod +x /usr/local/bin/tool
ADD archive.tar.gz /app/vendor/  # Keep ADD for tar extraction
```

---

COPY should be your default choice for transferring files into Docker images. It has predictable behavior that does exactly what you expect. Reserve ADD for its unique capabilities: extracting local tar archives automatically. For downloading files from URLs, prefer RUN with curl or wget for better control over caching, checksums, and error handling. This approach makes your Dockerfiles easier to understand and maintain.
