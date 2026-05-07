# How to Fix Podman Build Context Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Dockerfile, Build, DevOps

Description: Learn how to fix Podman build context problems including files not found during build, oversized contexts, .dockerignore issues, and multi-stage build path errors.

---

> Podman build context issues cause "file not found" errors during image builds, slow builds from processing too much data, and unexpected files in your images. This guide explains how the build context works and how to fix every common problem.

You run `podman build` and get an error saying a file does not exist, even though you can see it on disk. Or your build takes forever because Podman is processing gigabytes of data in the build context. Or sensitive files end up in your image even though you did not mean to include them. All of these problems stem from misunderstanding how the build context works.

---

## Understanding Build Context

When you run `podman build`, the last argument specifies the build context directory. Podman uses the contents of this directory as the build context. Every `COPY` and `ADD` instruction in your Dockerfile references files relative to this context, not relative to the Dockerfile location.

```bash
# The "." means the current directory is the build context

podman build -t my-app .

# You can specify a different context
podman build -t my-app /path/to/context

# The Dockerfile can be outside the context
podman build -t my-app -f /other/path/Dockerfile /path/to/context
```

The critical rule is: **files referenced in COPY and ADD must be inside the build context directory.** You cannot copy files from outside the context.

## Fix 1: Ensure Files Are Inside the Build Context

The most common error is trying to copy a file that is outside the context directory:

```text
COPY failed: file not found in build context
```

Given this directory structure:

```text
/project/
  /shared/
    config.json
  /app/
    Dockerfile
    src/
      main.py
```

If you build from inside `/project/app/`:

```bash
cd /project/app
podman build -t my-app .
```

Your Dockerfile cannot access `../shared/config.json`:

```dockerfile
# This FAILS - file is outside the build context
COPY ../shared/config.json /app/config.json
```

Fix by building from the parent directory:

```bash
cd /project
podman build -t my-app -f app/Dockerfile .
```

Now your Dockerfile can reference both directories:

```dockerfile
COPY shared/config.json /app/config.json
COPY app/src/ /app/src/
```

## Fix 2: Use .dockerignore to Control Context Size

If your build is slow, Podman is probably processing too many files as context. Check the context size:

```bash
# See how much data is in the build context
du -sh .

# See what would be sent
find . -not -path './.git/*' | wc -l
```

Create a `.dockerignore` file in the root of your build context to exclude unnecessary files:

```text
# .dockerignore
.git
.gitignore
node_modules
*.md
docs/
tests/
.env
.env.*
*.log
tmp/
dist/
build/
__pycache__
*.pyc
.venv
venv
.idea
.vscode
```

This dramatically reduces build time by preventing large directories from being included in the build context.

Note that Podman also supports `.containerignore` as an alternative name:

```bash
# Podman checks for these files in order:
# 1. .containerignore
# 2. .dockerignore
```

## Fix 3: Fix Dockerfile Path vs Context Path Confusion

A common mistake is confusing the Dockerfile location with the build context:

```bash
# This sets context to current dir AND looks for Dockerfile here
podman build .

# This sets context to current dir but uses a Dockerfile from elsewhere
podman build -f ../Dockerfile .

# This sets context to ../project and uses its Dockerfile
podman build ../project
```

When using `-f` to specify a Dockerfile location, remember that `COPY` paths are still relative to the context (the last argument), not the Dockerfile:

```bash
podman build -f build/Dockerfile src/
```

In this case, `COPY main.py /app/` copies `src/main.py`, not `build/main.py`.

## Fix 4: Handle Symlinks in Build Context

Symlinks in the build context do not let you copy files from outside the context. If a symlink points to a path outside the context, the target file is not added to the context as a regular file:

```bash
# This symlink points outside the build context
ls -la config -> /etc/my-app/config

# The target file is still outside the build context
```

Fix by copying the actual files into the build context, or restructure your project so the symlink target is also inside the context.

## Fix 5: Fix Multi-Stage Build Copy Issues

In multi-stage builds, copying between stages uses a different syntax than copying from the context:

```dockerfile
# Stage 1: Build
FROM golang:1.22 AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /app

# Stage 2: Runtime
FROM alpine:3.19

# Bad - this copies from the BUILD CONTEXT, not from the builder stage
COPY /app /usr/local/bin/app

# Good - this copies from the builder stage
COPY --from=builder /app /usr/local/bin/app
```

The `--from=builder` flag is essential. Without it, `COPY` looks in the build context, where `/app` does not exist.

You can also copy from external images:

```dockerfile
COPY --from=nginx:latest /etc/nginx/nginx.conf /etc/nginx/nginx.conf
```

## Fix 6: Handle COPY with Wildcards

Wildcard patterns in COPY instructions follow Go's filepath.Match rules, which differ from shell globbing:

```dockerfile
# Copy all .py files from the context root
COPY *.py /app/

# Copy all files from a directory
COPY src/ /app/src/

# Bad - this does NOT recursively match .py files
COPY **/*.py /app/

# Good - copy the entire directory and use RUN to filter if needed
COPY src/ /app/src/
```

If you need selective copying, structure your `.dockerignore` file to exclude unwanted files, then copy the entire directory.

## Fix 7: Fix Permission Issues with COPY

Files copied with COPY maintain their original permissions from the build context. If the build context files are not readable, the build fails:

```bash
# Check permissions before building
ls -la src/

# Fix permissions
chmod -R a+r src/
```

You can also set ownership during COPY:

```dockerfile
# Copy and change ownership
COPY --chown=1000:1000 src/ /app/src/

# For rootless builds, use numeric IDs
COPY --chown=65534:65534 config.json /app/config.json
```

## Fix 8: Debug Build Context Contents

When you cannot figure out why a file is missing, debug the build context:

```dockerfile
# Add a debug step to see what files are in the context
FROM alpine:3.19

# Copy everything and list it
COPY . /debug-context/
RUN find /debug-context -type f | head -50
```

Build and check the output:

```bash
podman build --no-cache -t debug-context .
```

You can also check what `.dockerignore` is excluding by building a temporary debug Dockerfile from standard input:

```bash
podman build --no-cache -f - . <<'EOF'
FROM alpine:3.19
COPY . /debug-context/
RUN find /debug-context -type f | sort | head -100
EOF
```

## Fix 9: Handle Large Files Efficiently

If your build requires large files that should not be in the final image, use multi-stage builds:

```dockerfile
FROM ubuntu:22.04 AS downloader
RUN apt-get update && apt-get install -y wget
RUN wget https://example.com/large-file.tar.gz
RUN tar xzf large-file.tar.gz

FROM ubuntu:22.04
COPY --from=downloader /extracted-files/ /app/data/
```

This avoids including the large archive in the final image. The download stage is discarded after the build.

## Fix 10: Use .dockerignore with Podman Compose

When using Compose files, the build context is specified in the `build` section:

```yaml
services:
  my-app:
    build:
      context: .
      dockerfile: Dockerfile
```

The `.dockerignore` file should be placed in the directory specified by `context`. If your context is the repository root and your Dockerfile is in a subdirectory, the `.dockerignore` must still be in the repository root.

## Conclusion

Build context issues in Podman come down to understanding one principle: the build context is a snapshot of a directory used by the build process, and all COPY paths are relative to it. Keep your context small with `.dockerignore`, use the `-f` flag to separate Dockerfile location from context directory, and use `--from` in multi-stage builds to copy between stages. When debugging, add a temporary build step that lists the context contents to see exactly what Podman has access to during the build.
