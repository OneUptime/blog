# How to Fix Docker 'COPY Failed: No Source Files Were Specified' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, dockerfile, COPY, build error, dockerignore, troubleshooting, build context

Description: Fix the Docker COPY failed error when source files are missing from the build context due to dockerignore rules, wrong paths, or build context issues.

---

You write a perfectly reasonable Dockerfile, run `docker build`, and get hit with "COPY failed: no source files were specified." The files exist on your machine. You can see them right there in the directory. But Docker insists they do not exist. This error is one of the most common Dockerfile build failures, and it almost always comes down to how Docker's build context works.

Let's go through every cause of this error and how to fix each one.

## Understanding Docker Build Context

When you run `docker build .`, Docker does not give the Dockerfile direct access to your filesystem. Instead, it packages everything in the specified directory (the build context) into a tar archive and sends it to the Docker daemon. The COPY and ADD instructions can only access files that exist within this build context.

The error means Docker looked for the source files inside the build context tar archive and found nothing matching your specification.

```
COPY failed: no source files were specified
```

Or the more detailed version:

```
COPY failed: file not found in build context or excluded by .dockerignore: stat src/app.js: file does not exist
```

## Cause 1: .dockerignore Excluding the Files

The most frequent cause is a `.dockerignore` file that excludes the files you are trying to COPY. Docker reads `.dockerignore` before building the context, and excluded files never make it into the build.

Check your `.dockerignore`:

```bash
# View the dockerignore file
cat .dockerignore
```

Common problematic patterns:

```
# .dockerignore - patterns that accidentally exclude too much

# This excludes EVERYTHING
*

# This excludes all directories named 'src'
src/

# This excludes all .js files everywhere
**/*.js
```

If you use a wildcard exclusion pattern, you need explicit exceptions:

```
# .dockerignore - exclude everything then whitelist what you need
*
!src/
!package.json
!package-lock.json
!tsconfig.json
```

The order matters. Exceptions must come after the pattern they override. Also, a directory exception like `!src/` only works if you haven't excluded its parent with a more specific rule.

Test what your `.dockerignore` includes by listing the build context:

```bash
# Create a test Dockerfile that lists all files in the build context
cat > /tmp/Dockerfile.test << 'TESTEOF'
FROM alpine:latest
COPY . /context
RUN find /context -type f | head -50
TESTEOF

# Build with the test Dockerfile to see what files are in the context
docker build -f /tmp/Dockerfile.test --progress=plain --no-cache . 2>&1 | grep context/
```

## Cause 2: Wrong Build Context Path

The build context is determined by the path argument to `docker build`, not by where the Dockerfile is located.

```bash
# Common mistake: running build from the wrong directory
cd /project/docker
docker build .  # Build context is /project/docker, not /project

# Correct: set the build context to the project root
docker build -f docker/Dockerfile /project
```

In Docker Compose, the build context is controlled by the `context` key:

```yaml
# docker-compose.yml - incorrect context
services:
  app:
    build:
      context: ./docker    # Only files in ./docker are available
      dockerfile: Dockerfile

# docker-compose.yml - correct context
services:
  app:
    build:
      context: .           # Project root is the build context
      dockerfile: docker/Dockerfile
```

## Cause 3: COPY Path Does Not Match Actual File Location

The source path in COPY is relative to the build context root, not relative to the Dockerfile.

```dockerfile
# If your project structure is:
# /project/
#   docker/
#     Dockerfile
#   src/
#     app.js
#   package.json

# This will fail if build context is /project/docker
COPY src/app.js /app/

# This works if build context is /project
COPY src/app.js /app/
```

Use the correct relative path from the build context:

```dockerfile
# Dockerfile - paths are relative to build context, not to Dockerfile location
FROM node:18-alpine
WORKDIR /app

# These paths must exist relative to the build context root
COPY package.json package-lock.json ./
RUN npm install

COPY src/ ./src/
```

## Cause 4: Glob Patterns Not Matching

Docker COPY supports simple glob patterns, but they work differently from shell globs.

```dockerfile
# This matches files named package.json and package-lock.json
COPY package*.json ./

# This does NOT recursively match - it only matches in the current directory
COPY *.js ./

# To copy all .js files recursively, copy the directory instead
COPY src/ ./src/
```

Be careful with patterns that might match nothing:

```dockerfile
# If no .conf files exist in the build context, this will fail
COPY *.conf /etc/app/

# Safer approach: check if files exist or use a directory
COPY config/ /etc/app/
```

## Cause 5: Symlinks in the Build Context

Docker does not follow symlinks when building the context. If a file you are trying to COPY is actually a symlink, the symlink itself is included but not the target.

```bash
# Check for symlinks in your project
find . -type l -ls

# If src is a symlink, Docker won't follow it
ls -la src
# lrwxr-xr-x  1 user  group  14 Jan  1 00:00 src -> ../shared/src
```

Replace symlinks with actual directories or files before building:

```bash
# Replace symlink with actual copy for Docker build
rm src
cp -r ../shared/src ./src
docker build .
```

Or restructure your build context to avoid needing symlinks.

## Cause 6: Case Sensitivity

File paths in Docker are case-sensitive, even on macOS and Windows where the host filesystem might not be.

```dockerfile
# If the actual file is README.md, these will fail on Linux:
COPY Readme.md ./    # Wrong case
COPY readme.md ./    # Wrong case
COPY README.md ./    # Correct
```

This often manifests as "works on my Mac, fails in CI" because macOS HFS+ is case-insensitive while Linux ext4 is case-sensitive.

## Cause 7: Multi-Stage Build Reference Errors

In multi-stage builds, COPY --from refers to files in a previous stage, not the build context.

```dockerfile
# Multi-stage build - common confusion
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
# This copies from the builder stage, not from the build context
COPY --from=builder /app/dist /usr/share/nginx/html

# This would copy from the build context (no --from flag)
COPY nginx.conf /etc/nginx/nginx.conf
```

If you get the error on a `COPY --from` instruction, the file does not exist in the previous stage:

```bash
# Debug by checking what files exist in the build stage
# Add a temporary RUN instruction to list files
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm run build
RUN ls -la /app/dist/    # Debug: verify the output directory exists
```

## Debugging Checklist

Run through this checklist when you hit the COPY error:

```bash
# 1. Verify the file exists locally
ls -la src/app.js

# 2. Check .dockerignore
cat .dockerignore

# 3. Verify the build context
# Add this to the top of your Dockerfile temporarily:
# RUN ls -la /

# 4. Check for symlinks
file src/app.js

# 5. Build with verbose output
DOCKER_BUILDKIT=1 docker build --progress=plain --no-cache .
```

## Prevention

Add a comment in your Dockerfile documenting the expected build context:

```dockerfile
# Dockerfile
# Build context: project root (run: docker build -f docker/Dockerfile .)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src/ ./src/
```

And keep your `.dockerignore` minimal and well-documented:

```
# .dockerignore - exclude non-essential files from build context
.git
.github
.vscode
node_modules
*.md
!README.md
docker-compose*.yml
.env*
```

## Summary

The "COPY failed: no source files were specified" error always means the file you referenced does not exist in Docker's build context. Check your `.dockerignore` first since that is the most common culprit. Then verify you are running `docker build` from the right directory with the right context path. Remember that COPY paths are relative to the build context root, not to the Dockerfile's location. When debugging, build a test image that lists the build context contents so you can see exactly what Docker has access to.
