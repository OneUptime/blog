# How to Use Multiple Build Contexts in Docker Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Build, BuildKit, Docker Build, Multi-Context, DevOps, Advanced Docker

Description: Learn how to use Docker's multiple build contexts feature to pull files from different directories, images, and Git repos during a single build.

---

Docker builds traditionally work with a single build context - one directory whose contents get sent to the Docker daemon. This creates friction when your Dockerfile needs files from multiple locations. You end up copying files around, restructuring directories, or building complex wrapper scripts. Docker BuildKit's multiple build contexts feature solves this problem cleanly.

## What Are Build Contexts?

A build context is the set of files that Docker can access during the build process. When you run `docker build .`, the current directory becomes the build context. Every `COPY` and `ADD` instruction pulls from this context.

With multiple build contexts, you can name additional contexts and reference them in your Dockerfile. Each context can be a local directory, a Docker image, or even a Git repository.

## Enabling BuildKit

Multiple build contexts require BuildKit. Make sure it is enabled:

```bash
# Set the environment variable to enable BuildKit
export DOCKER_BUILDKIT=1

# Alternatively, use docker buildx which always uses BuildKit
docker buildx build ...
```

## Basic Syntax

The `--build-context` flag lets you define named contexts. In your Dockerfile, you reference them with the `--from=` syntax in `COPY` instructions.

```bash
# Define two additional contexts alongside the main one
docker buildx build \
  --build-context shared-config=/path/to/config \
  --build-context common-scripts=/path/to/scripts \
  -t myapp:latest .
```

Inside the Dockerfile, reference these named contexts:

```dockerfile
# Dockerfile using multiple build contexts
FROM node:20-alpine

WORKDIR /app

# Copy from the main build context (current directory)
COPY package.json ./
RUN npm install

# Copy from the "shared-config" context
COPY --from=shared-config nginx.conf /etc/nginx/nginx.conf

# Copy from the "common-scripts" context
COPY --from=common-scripts entrypoint.sh /usr/local/bin/entrypoint.sh

COPY . .
CMD ["node", "server.js"]
```

## Real-World Use Cases

### Monorepo Builds

In a monorepo, services often share libraries or configuration files. Without multiple contexts, you must set the build context to the repository root and use long relative paths. Multiple contexts make this cleaner.

Suppose your monorepo looks like this:

```
monorepo/
  shared/
    utils/
    config/
  services/
    api/
      Dockerfile
    web/
      Dockerfile
```

Build the API service with access to shared code:

```bash
# Build from the services/api directory, with shared code as a named context
docker buildx build \
  --build-context shared=../../shared \
  -t api:latest \
  ./services/api
```

The Dockerfile for the API service can then pull from both contexts:

```dockerfile
# services/api/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy shared utilities from the named context
COPY --from=shared utils/ ./shared/utils/
COPY --from=shared config/default.json ./config/

# Copy API-specific files from the main context
COPY package.json package-lock.json ./
RUN npm ci --production

COPY src/ ./src/

CMD ["node", "src/index.js"]
```

### Using a Docker Image as a Context

You can point a named context to a Docker image. This is useful for pulling binaries or configuration files from existing images without writing a multi-stage build.

```bash
# Use an nginx image as a context to grab its default config
docker buildx build \
  --build-context nginx-base=docker-image://nginx:1.25-alpine \
  -t custom-nginx:latest .
```

```dockerfile
# Pull the default nginx config from the nginx image
FROM nginx:1.25-alpine

# Grab a specific file from the nginx-base context (the same image here, but
# could be any image with config files you need)
COPY --from=nginx-base /etc/nginx/nginx.conf /etc/nginx/nginx.conf.default

# Now add your custom config
COPY nginx.conf /etc/nginx/nginx.conf
```

A more practical example pulls a binary from a tools image:

```bash
# Use a tools image as a context for grabbing a binary
docker buildx build \
  --build-context tools=docker-image://alpine/curl:latest \
  -t myapp:latest .
```

```dockerfile
FROM alpine:3.19

# Grab curl binary from the tools image context
COPY --from=tools /usr/bin/curl /usr/local/bin/curl

# Continue building your app
RUN apk add --no-cache ca-certificates
COPY app /usr/local/bin/app
CMD ["app"]
```

### Using a Git Repository as a Context

Named contexts can also point to Git repositories, which is useful for pulling shared Dockerfiles, scripts, or configuration maintained in a separate repo.

```bash
# Use a Git repo as a named context
docker buildx build \
  --build-context deploy-scripts=https://github.com/your-org/deploy-tools.git#main \
  -t myapp:latest .
```

```dockerfile
FROM ubuntu:22.04

# Pull deployment scripts from the Git repository context
COPY --from=deploy-scripts scripts/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

HEALTHCHECK CMD ["/usr/local/bin/healthcheck.sh"]

COPY . /app
CMD ["/app/start.sh"]
```

## Overriding Build Stages with Contexts

One powerful pattern is using named contexts to replace build stages. If your Dockerfile has a `FROM` instruction that names a stage, you can substitute it with a named context at build time.

Consider this Dockerfile:

```dockerfile
# The "base" stage can be overridden at build time
FROM alpine:3.19 AS base
RUN apk add --no-cache curl

FROM base
COPY app /usr/local/bin/app
CMD ["app"]
```

Override the `base` stage with a prebuilt image:

```bash
# Replace the "base" stage with a custom prebuilt image
docker buildx build \
  --build-context base=docker-image://my-custom-base:latest \
  -t myapp:latest .
```

Now the build skips the `FROM alpine:3.19 AS base` stage entirely and uses `my-custom-base:latest` instead. This is particularly useful in CI/CD where you can prebuild base images and inject them into downstream builds.

## Combining Multiple Contexts in Docker Compose

Docker Compose supports multiple build contexts in the `build` configuration:

```yaml
# docker-compose.yml with multiple build contexts
version: "3.9"

services:
  api:
    build:
      context: ./services/api
      additional_contexts:
        shared: ./shared
        proto: ./proto
      dockerfile: Dockerfile
    ports:
      - "8080:8080"

  web:
    build:
      context: ./services/web
      additional_contexts:
        shared: ./shared
        assets: ./design/assets
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
```

Run the build as usual:

```bash
# Build both services with their additional contexts
docker compose build
```

## Context Naming Rules

Named contexts must follow Docker's naming conventions:

- Names must be lowercase
- Names can contain letters, digits, hyphens, underscores, and periods
- Names cannot start with a digit
- The name cannot conflict with existing stage names in the Dockerfile unless you intend to override them

```bash
# Valid context names
--build-context shared-lib=./lib
--build-context config_files=./config
--build-context tools.v2=./tools

# Invalid - starts with a digit
--build-context 2ndcontext=./second
```

## Security Considerations

Multiple build contexts expand the attack surface of your builds. Each context is a source of files that end up in your image, so treat them with the same scrutiny as your main build context.

Create a `.dockerignore` file in each context directory to exclude sensitive files:

```
# .dockerignore in the shared config directory
*.env
secrets/
.git/
```

When using Git repositories as contexts, pin them to specific commits rather than branches:

```bash
# Pin to a specific commit for reproducibility and security
docker buildx build \
  --build-context scripts=https://github.com/your-org/scripts.git#abc123def \
  -t myapp:latest .
```

## Debugging Multiple Contexts

When a build fails and you are unsure which context is providing files, add diagnostic steps to your Dockerfile:

```dockerfile
FROM alpine:3.19

# List what is available in each context for debugging
COPY --from=shared . /tmp/shared-debug/
RUN ls -la /tmp/shared-debug/ && rm -rf /tmp/shared-debug/

COPY --from=config . /tmp/config-debug/
RUN ls -la /tmp/config-debug/ && rm -rf /tmp/config-debug/
```

## Wrapping Up

Multiple build contexts eliminate the need for file-copying workarounds and overly broad build contexts. They keep Dockerfiles clean, make monorepo builds manageable, and allow you to compose images from files spread across directories, images, and repositories. Start by identifying builds where you copy files from outside the build context directory, and convert those to named contexts.
