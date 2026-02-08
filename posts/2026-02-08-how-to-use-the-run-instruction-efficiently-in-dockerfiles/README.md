# How to Use the RUN Instruction Efficiently in Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, RUN, Build Optimization, Layers, DevOps

Description: Learn how to write efficient RUN instructions in Dockerfiles to minimize image size, reduce build times, and avoid common pitfalls.

---

The RUN instruction is the workhorse of any Dockerfile. It executes commands during the image build process, and every RUN instruction creates a new layer in the resulting image. How you write your RUN instructions directly affects image size, build speed, layer caching behavior, and overall image quality.

This guide covers both the shell and exec forms of RUN, demonstrates techniques for writing efficient instructions, and highlights common mistakes that lead to bloated images.

## The Two Forms of RUN

RUN supports two syntactic forms: shell form and exec form.

### Shell Form

The shell form passes the command to `/bin/sh -c`:

```dockerfile
# Shell form - executed via /bin/sh -c
RUN apt-get update && apt-get install -y curl
```

This is the most common form. It supports shell features like variable expansion, piping, command chaining, and redirection.

### Exec Form

The exec form takes a JSON array of strings and executes the command directly without a shell:

```dockerfile
# Exec form - executed directly, no shell processing
RUN ["apt-get", "update"]
```

The exec form does not support shell features. No variable substitution, no pipes, no `&&` chaining. Use it when you need to avoid shell string processing, or when you want to use a different shell.

```dockerfile
# Use exec form to run a command with a specific shell
RUN ["/bin/bash", "-c", "echo $HOME"]
```

For most cases, the shell form is more practical and readable.

## Combining Commands to Reduce Layers

Every RUN instruction creates a new layer. Layers take up space, and each one adds overhead to image pulls and storage. Combining related commands into a single RUN instruction reduces the number of layers.

Here is an example of the wrong way to do it:

```dockerfile
# Bad - creates 4 separate layers, and cleanup in a later layer
# does NOT reduce the size of earlier layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN rm -rf /var/lib/apt/lists/*
```

The correct approach combines these into a single RUN instruction:

```dockerfile
# Good - single layer with cleanup in the same instruction
RUN apt-get update && \
    apt-get install -y \
      curl \
      git \
    && rm -rf /var/lib/apt/lists/*
```

The cleanup step (`rm -rf /var/lib/apt/lists/*`) must happen in the same RUN instruction as the install. If you put it in a separate RUN, the package cache is already baked into a previous layer and the removal does not save any space.

## Cleaning Up in the Same Layer

This is one of the most important rules of efficient Dockerfiles. Anything you create and then delete must be handled in the same RUN instruction. Docker layers are additive - you cannot shrink a layer by deleting files in a subsequent layer.

```dockerfile
# Efficient - downloads, installs, and cleans up in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      libpq-dev \
    && pip install --no-cache-dir psycopg2-binary \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*
```

This pattern is especially important when you install build dependencies only needed for compilation. Install them, use them, and remove them all in the same layer.

## Using --no-install-recommends

Debian and Ubuntu's `apt-get` installs recommended packages by default. These are often unnecessary for Docker images.

```dockerfile
# Without --no-install-recommends: installs many extra packages
RUN apt-get update && apt-get install -y python3

# With --no-install-recommends: installs only required dependencies
RUN apt-get update && apt-get install -y --no-install-recommends python3
```

The difference can be substantial. A single package like `python3` might pull in dozens of recommended packages you do not need, adding hundreds of megabytes.

## Leveraging Build Cache Effectively

Docker caches each layer. If a RUN instruction has not changed and none of the instructions before it have changed, Docker reuses the cached layer. Understanding this behavior helps you structure RUN instructions for fast rebuilds.

Place instructions that change frequently at the bottom of the Dockerfile:

```dockerfile
FROM python:3.11-slim

# This rarely changes - will be cached
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# This changes when dependencies change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# This changes with every code change - put it last
COPY . .
```

If you combine the dependency install and code copy into a single step, every code change invalidates the entire layer and forces a full dependency reinstall.

## Using --mount for Build Secrets and Caches

Modern Dockerfiles (with BuildKit) support the `--mount` flag on RUN instructions. This lets you mount secrets and caches without including them in the image layer.

### Cache Mounts

Cache mounts persist a directory across builds, which is perfect for package manager caches:

```dockerfile
# Cache pip downloads across builds - dramatically speeds up rebuilds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

```dockerfile
# Cache npm downloads across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

```dockerfile
# Cache apt package downloads
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y curl git
```

Cache mounts do not add anything to the image layer. The cache directory is mounted during the build step and unmounted afterward.

### Secret Mounts

Secret mounts let you use credentials during the build without baking them into the image:

```dockerfile
# Use a secret file during the build (not stored in the image)
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

Pass the secret at build time:

```bash
# Provide the secret when building
docker build --secret id=npmrc,src=$HOME/.npmrc -t myapp .
```

## Handling Multiple Package Managers

When your application needs packages from multiple sources (system packages, language packages, etc.), organize them logically:

```dockerfile
FROM python:3.11-slim

# Install system-level dependencies first (changes least frequently)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libpq-dev \
      libxml2-dev \
      libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (changes when requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (changes most frequently)
COPY . .
```

## Setting Shell Options for Safety

By default, shell form RUN instructions use `/bin/sh -c`, which does not fail on individual command failures in a pipeline. Use `set -e` and `set -o pipefail` for safer scripts:

```dockerfile
# Enable strict error handling
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl; \
    rm -rf /var/lib/apt/lists/*
```

The flags do the following:
- `-e` exits on any command failure
- `-u` treats unset variables as errors
- `-x` prints each command before executing (useful for debugging builds)

Or change the default shell for all subsequent RUN instructions:

```dockerfile
# Change the default shell to bash with strict mode
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# Now all RUN instructions use bash with error handling
RUN curl -fsSL https://example.com/install.sh | bash
```

## Avoiding Common Mistakes

### Don't Cache Bust Unnecessarily

Adding `apt-get update` in a separate RUN instruction from `apt-get install` creates a caching problem. Docker may cache the update step and use stale package lists:

```dockerfile
# Bad - cached update can lead to install failures
RUN apt-get update
RUN apt-get install -y curl

# Good - always combine update and install
RUN apt-get update && apt-get install -y curl
```

### Don't Install Debug Tools in Production Images

Resist the temptation to install editors, debuggers, or diagnostic tools in production images:

```dockerfile
# Bad for production
RUN apt-get update && apt-get install -y vim strace gdb

# Instead, use multi-stage builds or debug containers
# Keep production images lean
```

### Don't Ignore the pip Cache

pip caches downloaded packages by default. In Docker, this wastes space:

```dockerfile
# Without --no-cache-dir, pip cache files end up in the layer
RUN pip install flask

# With --no-cache-dir, no cache files are stored
RUN pip install --no-cache-dir flask
```

## Debugging RUN Instructions

When a RUN instruction fails, you need to debug it. Here are some techniques:

```bash
# Build with progress output to see what is happening
docker build --progress=plain -t myapp .

# Build up to a specific stage and inspect
docker build --target builder -t myapp-debug .
docker run -it myapp-debug /bin/bash
```

You can also add temporary RUN instructions for debugging:

```dockerfile
# Temporary debug step - remove before merging
RUN ls -la /app && cat /app/requirements.txt
```

## Summary

Writing efficient RUN instructions comes down to a few key practices: combine related commands into single instructions, clean up in the same layer where you create files, use `--no-install-recommends` for apt, leverage cache mounts for package managers, and order instructions from least to most frequently changing. These practices directly reduce image size, speed up builds, and produce cleaner images. The RUN instruction may be simple in concept, but mastering it is essential for building production-quality Docker images.
