# How to Use COPY vs ADD in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, COPY, ADD, Container Image

Description: Understand the differences between COPY and ADD instructions in Podman Containerfiles, when to use each one, and why COPY is the preferred choice for most use cases.

---

> COPY and ADD both transfer files into your container image, but they have important differences. Understanding when to use each instruction helps you write clearer, more predictable Containerfiles.

When building container images with Podman, you frequently need to add files from your local filesystem into the image. The Containerfile specification provides two instructions for this: COPY and ADD. While they appear similar at first glance, they have distinct behaviors that affect your build process, image size, and the clarity of your Containerfile.

This guide explains the differences between COPY and ADD, demonstrates their respective use cases with practical examples, and provides clear guidance on which to choose in different scenarios.

---

## COPY Instruction Basics

COPY transfers files or directories from the build context into the container filesystem. It is straightforward and predictable.

```dockerfile
# Basic file copy

COPY app.py /app/app.py

# Copy a directory
COPY src/ /app/src/

# Copy multiple files
COPY package.json package-lock.json /app/

# Copy with a glob pattern
COPY *.py /app/

# Copy everything
COPY . /app/
```

### COPY with --chown Flag

You can set ownership during the copy operation:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy files and set ownership to the node user
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

USER node
CMD ["node", "dist/server.js"]
```

This is more efficient than copying and then running a separate `chown` command, which would create an additional layer.

### COPY with --chmod Flag

Set file permissions during the copy:

```dockerfile
# Copy a script and make it executable
COPY --chmod=755 entrypoint.sh /usr/local/bin/entrypoint.sh
```

### COPY from Build Stages

COPY can pull files from other build stages using the `--from` flag:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server .

FROM alpine:3.19
# Copy the binary from the builder stage
COPY --from=builder /app/server /usr/local/bin/server
CMD ["server"]
```

You can also copy from external images:

```dockerfile
FROM alpine:3.19
# Copy a binary from another image entirely
COPY --from=busybox:musl /bin/busybox /bin/busybox
```

## ADD Instruction Basics

ADD behaves like COPY for ordinary files and directories from the build context, plus automatic tar extraction and URL downloading.

```dockerfile
# Basic file add (same as COPY)
ADD app.py /app/app.py

# Automatic tar extraction
ADD archive.tar.gz /app/

# URL downloading (not recommended)
ADD https://example.com/file.txt /app/file.txt
```

### Automatic Archive Extraction

The primary unique feature of ADD is that it automatically extracts recognized compressed archives when the source is a local tar file:

```dockerfile
# ADD extracts tar archives automatically
ADD app.tar.gz /app/
# Result: /app/ contains the extracted contents

# Supported formats: gzip, bzip2, xz, tar
ADD data.tar.bz2 /data/
ADD config.tar.xz /etc/myapp/
```

Compare this with COPY, which does not extract archives:

```dockerfile
# COPY preserves the archive as-is
COPY app.tar.gz /app/
# Result: /app/app.tar.gz (the compressed file itself)
```

### URL Downloading with ADD

ADD can download files from URLs:

```dockerfile
# ADD can fetch remote files
ADD https://example.com/config.json /app/config.json
```

However, this feature has significant drawbacks and is generally discouraged. Files downloaded via ADD URL cannot benefit from build cache invalidation based on content changes, the downloaded file gets a permission of 600, and you cannot remove the downloaded file in the same layer to save space. Podman's Containerfile documentation also allows remote file URLs with COPY, but the same recommendation applies: use RUN with a download tool when you need a remote file.

A better approach uses RUN with curl or wget:

```dockerfile
# Better: Use RUN for downloading
RUN curl -fsSL https://example.com/config.json -o /app/config.json && \
    chmod 644 /app/config.json
```

With RUN, you can chain commands to verify checksums, set permissions, and clean up, all in one layer:

```dockerfile
RUN curl -fsSL https://example.com/tool-v1.2.tar.gz -o /tmp/tool.tar.gz && \
    echo "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  /tmp/tool.tar.gz" | sha256sum -c - && \
    tar xzf /tmp/tool.tar.gz -C /usr/local/bin/ && \
    rm /tmp/tool.tar.gz
```

## Key Differences at a Glance

Here is a practical comparison:

```dockerfile
# --- COPY behavior ---

# Copies a file
COPY config.json /app/config.json  # File copied as-is

# Copies a tar file without extracting
COPY archive.tar.gz /app/archive.tar.gz  # Archive preserved

# Podman's Containerfile syntax allows remote URLs with COPY,
# but RUN with curl or wget is usually better for downloads
# COPY https://example.com/file.txt /app/file.txt

# --- ADD behavior ---

# Copies a file (same as COPY)
ADD config.json /app/config.json  # File copied as-is

# Extracts a local tar file automatically
ADD archive.tar.gz /app/  # Archive extracted

# Can download from URLs (but shouldn't)
ADD https://example.com/file.txt /app/file.txt  # Downloads file
```

## When to Use COPY

Use COPY as your default instruction for transferring files into the image. It should be your first choice in nearly all situations:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Copy dependency file first for cache efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy configuration files
COPY config/production.yaml /etc/myapp/config.yaml

# Copy and set permissions on scripts
COPY --chmod=755 scripts/entrypoint.sh /usr/local/bin/

USER 1001
CMD ["python", "app.py"]
```

COPY is explicit, predictable, and does exactly one thing: it copies files. This makes your Containerfile easier to understand and audit.

## When to Use ADD

Use ADD only when you need its automatic tar extraction feature with local archives:

```dockerfile
FROM ubuntu:24.04

WORKDIR /opt

# Use ADD when you need automatic tar extraction
ADD application-bundle.tar.gz .
# The contents are extracted into /opt/

# You can also use ADD for archives that need extraction in-place
ADD vendor-libs.tar.xz /usr/local/lib/
```

A complete example showing appropriate ADD usage:

```dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python setup.py sdist && \
    tar xzf dist/myapp-1.0.tar.gz -C /tmp/

FROM python:3.12-slim

WORKDIR /app

# Use COPY --from for multi-stage builds (ADD does not support --from)
COPY --from=builder /tmp/myapp-1.0/ ./myapp-1.0/

RUN pip install --no-cache-dir myapp-1.0/ && \
    rm -rf myapp-1.0/

USER 1001
CMD ["myapp"]
```

Note: ADD does not support the `--from` flag. To transfer files between build stages, always use COPY with `--from`. If you need to extract a tar archive from a previous stage, extract it in that stage first, then use `COPY --from` to bring the extracted files into the final stage.

## Practical Patterns

### Pattern 1: Dependency Installation with COPY

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy only dependency files first
COPY package.json package-lock.json ./
RUN npm ci

# Then copy source code
COPY --chown=node:node src/ ./src/
COPY --chown=node:node tsconfig.json ./

RUN npm run build

USER node
CMD ["node", "dist/index.js"]
```

### Pattern 2: Multi-File Configuration with COPY

```dockerfile
FROM nginx:alpine

# Copy configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Copy static assets
COPY --chown=nginx:nginx public/ /usr/share/nginx/html/

# Copy SSL certificates
COPY --chmod=600 certs/server.key /etc/ssl/private/
COPY --chmod=644 certs/server.crt /etc/ssl/certs/

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

### Pattern 3: Extracting Vendor Dependencies with ADD

```dockerfile
FROM php:8.3-fpm-alpine

WORKDIR /var/www/html

# ADD for extracting pre-packaged vendor dependencies
ADD vendor.tar.gz .

# COPY for regular files
COPY composer.json composer.lock ./
COPY src/ ./src/
COPY public/ ./public/

RUN chown -R www-data:www-data /var/www/html

USER www-data
CMD ["php-fpm"]
```

## Using .containerignore with COPY and ADD

Both COPY and ADD respect the `.containerignore` file. Always create one to prevent unnecessary files from entering your build context:

```plaintext
# .containerignore
.git
.gitignore
node_modules
*.md
.env*
.vscode
.idea
coverage
tests
__pycache__
*.pyc
```

This reduces the build context size and prevents accidental inclusion of sensitive files like `.env`.

## Common Mistakes

```dockerfile
# Mistake 1: Using ADD when COPY would suffice
ADD app.py /app/app.py  # Use COPY instead

# Mistake 2: Using ADD or COPY for URL downloads
ADD https://example.com/data.csv /app/data.csv
# Use RUN with curl instead

# Mistake 3: Copying everything without .containerignore
COPY . /app/  # Might include .git, node_modules, .env

# Mistake 4: Not using --chown with COPY
COPY app.py /app/
RUN chown appuser:appuser /app/app.py  # Extra layer
# Better: COPY --chown=appuser:appuser app.py /app/
```

## Conclusion

The choice between COPY and ADD is straightforward: use COPY as your default for all file transfer operations. It is explicit, predictable, and does exactly what its name suggests. Reserve ADD for the one scenario where it provides genuine value: automatically extracting local tar archives into your image. Avoid ADD or COPY for URL downloads, using RUN with curl or wget instead for better control over permissions, caching, and cleanup. Following this simple guideline makes your Containerfiles clearer, your builds more predictable, and your images more efficient.
