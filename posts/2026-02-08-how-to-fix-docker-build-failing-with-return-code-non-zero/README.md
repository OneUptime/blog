# How to Fix Docker Build Failing with "Return Code Non-Zero"

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, build, non-zero exit code, troubleshooting, dockerfile, RUN instruction, debugging

Description: Diagnose and fix Docker build failures caused by non-zero return codes in RUN instructions with debugging techniques and practical workarounds.

---

You kick off a `docker build` and it fails partway through with a message like "The command returned a non-zero code: 1" (or 2, or 127, or any other number). The error is not very helpful on its own. It just tells you that a command inside a RUN instruction failed. The real question is why it failed, and that requires some detective work.

This guide covers how to figure out what went wrong and the most common fixes for non-zero return code build failures.

## Understanding the Error

Every command in a `RUN` instruction must exit with code 0 for the build to continue. Any non-zero exit code stops the build immediately. The error looks like this:

```
------
 > [stage 5/8] RUN npm install:
#8 12.45 npm ERR! code ENETUNREACH
#8 12.45 npm ERR! errno ENETUNREACH
------
Dockerfile:12
--------------------
  11 |     COPY package*.json ./
  12 | >>> RUN npm install
  13 |     COPY . .
--------------------
ERROR: process "/bin/sh -c npm install" did not complete successfully: exit code: 1
```

The exit code gives you a hint about what happened:

- Exit code 1: General error (command-specific)
- Exit code 2: Misuse of shell command
- Exit code 126: Permission problem (command not executable)
- Exit code 127: Command not found
- Exit code 128+N: Command killed by signal N (e.g., 137 = killed by OOM)

## Debugging Technique 1: Read the Full Output

BuildKit condenses output by default. Get the full, uncompressed output:

```bash
# Build with plain progress to see all output
docker build --progress=plain --no-cache -t myimage .
```

The `--no-cache` flag forces every step to run fresh, and `--progress=plain` shows the raw output from every command instead of the collapsed view.

## Debugging Technique 2: Build Up to the Failing Step

If the error is in step 8, add a temporary target that stops before the failing command:

```dockerfile
# Original Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install         # <-- This fails
COPY . .
RUN npm run build
```

Create a debug build that stops before the failure:

```bash
# Build only up to a specific stage using a target
# First, add a named stage in your Dockerfile before the failing line

# Or use the interactive approach: build an intermediate image
docker build --target debug -t debug-image .
```

Alternatively, comment out everything after the failing line and build an image you can explore:

```dockerfile
# Temporary debug Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# RUN npm install  # Commented out to debug
CMD ["sh"]         # Drop into a shell instead
```

```bash
# Build and run the debug image
docker build -t debug-image .
docker run -it debug-image sh

# Now run the failing command manually inside the container
npm install
```

This lets you see the exact error output and inspect the filesystem state.

## Debugging Technique 3: Use BuildKit Debug Shell

With recent Docker versions, you can drop into a shell at the failing layer:

```bash
# Enable BuildKit debug mode
BUILDX_EXPERIMENTAL=1 docker buildx debug --on=error build .
```

This starts an interactive session at the exact point where the build failed, letting you inspect files, run commands, and test fixes without rebuilding from scratch.

## Common Cause 1: Package Manager Failures

Package installation commands fail for many reasons: stale caches, missing dependencies, network issues.

For apt-get (Debian/Ubuntu):

```dockerfile
# Wrong: stale package lists cause failures
RUN apt-get install -y curl

# Right: always update before installing
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
```

For apk (Alpine):

```dockerfile
# Wrong: missing index update
RUN apk add curl

# Right: update index and install in one layer
RUN apk add --no-cache curl
```

For npm (Node.js):

```dockerfile
# Wrong: npm install can fail for many reasons
RUN npm install

# Better: use ci for deterministic installs and add retry logic
RUN npm ci --no-audit --no-fund || \
    (sleep 5 && npm ci --no-audit --no-fund)
```

## Common Cause 2: Command Not Found (Exit Code 127)

The command you are trying to run does not exist in the image.

```
/bin/sh: some-command: not found
The command '/bin/sh -c some-command' returned a non-zero code: 127
```

Fix by installing the needed package first:

```dockerfile
# Install the tool before using it
FROM alpine:latest

# Install curl (not included in alpine by default)
RUN apk add --no-cache curl

# Now curl is available
RUN curl -sSL https://example.com/setup.sh | sh
```

For Alpine-specific issues, some packages have different names:

```dockerfile
# Common Alpine package name differences
RUN apk add --no-cache \
    bash \          # Alpine uses ash by default, not bash
    coreutils \     # For GNU versions of common tools
    findutils \     # For GNU find with -printf support
    grep \          # For GNU grep with -P support
    procps          # For ps with full options
```

## Common Cause 3: Shell Differences

Docker uses `/bin/sh` by default for RUN instructions. On Alpine, `/bin/sh` is busybox ash, not bash. Bash-specific syntax will fail.

```dockerfile
# Wrong: bash syntax in sh shell
RUN if [[ "$NODE_ENV" == "production" ]]; then npm ci; fi

# Right: POSIX-compatible syntax
RUN if [ "$NODE_ENV" = "production" ]; then npm ci; fi

# Or explicitly use bash
SHELL ["/bin/bash", "-c"]
RUN if [[ "$NODE_ENV" == "production" ]]; then npm ci; fi
```

## Common Cause 4: Missing Files or Wrong Working Directory

Commands fail because expected files are not where the command looks for them.

```dockerfile
# Wrong: file not yet copied
RUN cat config.json    # Fails: config.json hasn't been COPY'd yet
COPY config.json .

# Right: copy before using
COPY config.json .
RUN cat config.json
```

```dockerfile
# Wrong: WORKDIR not set, running in /
COPY src/ ./src/
RUN cd src && npm run build   # May fail if relative paths break

# Right: set WORKDIR explicitly
WORKDIR /app
COPY src/ ./src/
RUN cd src && npm run build
```

## Common Cause 5: Network Unavailable During Build

Downloads fail because the build container cannot reach the internet.

```dockerfile
# This fails if DNS or network is broken during build
RUN curl -sSL https://example.com/installer.sh | sh
```

Test network access in your build:

```dockerfile
# Add a diagnostic step before the download
RUN ping -c 1 8.8.8.8 || echo "No network" && \
    nslookup example.com || echo "No DNS"
RUN curl -sSL https://example.com/installer.sh | sh
```

Fix DNS for builds:

```bash
# Build with host networking to use the host's DNS
docker build --network=host -t myimage .
```

## Common Cause 6: Permissions Issues (Exit Code 126)

Scripts copied into the image may not have execute permissions.

```dockerfile
# Wrong: script is not executable
COPY entrypoint.sh /entrypoint.sh
RUN /entrypoint.sh   # Exit code 126: Permission denied

# Right: make it executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && /entrypoint.sh

# Or set permissions before COPY using a .sh file with execute bit
# Make sure the file has +x in your local filesystem before building
```

## Common Cause 7: Piped Commands Hiding Errors

In a piped command, only the last command's exit code is checked by default.

```dockerfile
# Wrong: curl fails silently, sh runs on empty input
RUN curl https://example.com/script.sh | sh

# Right: use pipefail to catch errors in any part of the pipe
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
RUN curl -sSL https://example.com/script.sh | sh
```

For POSIX sh (Alpine), pipefail is not available. Use a different approach:

```dockerfile
# Download first, then execute
RUN curl -sSL -o /tmp/script.sh https://example.com/script.sh && \
    sh /tmp/script.sh && \
    rm /tmp/script.sh
```

## Ignoring Non-Zero Exit Codes

Sometimes a command returns a non-zero exit code that you want to ignore. Use `|| true` to suppress the error:

```dockerfile
# The grep command returns exit code 1 when no matches are found
# This is expected behavior, not an error
RUN grep "pattern" somefile.txt || true

# Or use a conditional
RUN if grep -q "pattern" somefile.txt; then echo "found"; fi
```

Only do this when you genuinely expect the command to fail in normal operation. Do not blanket-suppress errors.

## Summary

Docker build failures with non-zero exit codes are just the build telling you a command inside a RUN instruction failed. The exit code itself gives you a starting clue: 1 means a general error, 127 means command not found, 126 means permission denied, and 137 usually means out of memory. Use `--progress=plain --no-cache` to see the full output. For stubborn failures, build up to the failing step and drop into a shell to debug interactively. Most failures come down to missing packages, stale caches, network issues, or shell compatibility differences between bash and sh.
