# 10 Docker Superpowers Developers Forget to Use

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Performance, Security

Description: Ten field-tested Docker techniques - from BuildKit secrets to Compose profiles - that quietly reduce image size, harden workloads, and save developer hours.

Docker has been around long enough that most teams treat it as solved tooling, yet I still uncovers the same underused features. Here are ten practical capabilities that rarely make it into day-to-day workflows but pay reliability and velocity dividends immediately.

## 1. Multi-stage builds keep prod images tiny

Ship only what you need. Use a heavy build stage for toolchains and a clean runtime stage so you do not leak compilers and caches into production layers.

```dockerfile
# Stage 1: Full Node.js environment for building
FROM node:22 AS build
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci

# Build the application (e.g., compile TypeScript, bundle assets)
COPY . .
RUN npm run build

# Stage 2: Minimal distroless image - no npm, no shell, just Node.js runtime
FROM gcr.io/distroless/nodejs22
# Copy only the compiled output from the build stage
COPY --from=build /app/dist /app
CMD ["server.js"]
```

Pair this with `--target` when you need to run CI tasks inside intermediate stages without bloating the final artifact.

## 2. BuildKit cache mounts turn `npm ci` into milliseconds

Enable BuildKit (`DOCKER_BUILDKIT=1`) and add cache mounts so expensive steps reuse artifacts across builds. The cache persists between builds on the same machine.

```dockerfile
# Mount a persistent cache directory for npm packages
# target: Where the cache is mounted inside the container
# This cache survives between builds, making subsequent installs near-instant
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline
```

Treat cache mounts like shared volumes: never bake secrets into them and periodically invalidate them with `--build-arg CACHE_BUST=$(date +%s)` when dependencies change.

## 3. Secrets stay out of layers with `RUN --mount=type=secret`

Stop copying `.env` files into images. BuildKit can inject secrets at build time that never persist in the final layer.

The following command builds an image while passing a secret file that will only be available during build, never stored in the image.

```bash
# Build with a secret mounted from local filesystem
# --secret id=npmrc: Unique identifier for the secret
# src=$HOME/.npmrc: Path to the secret file on your machine
docker build \
  --secret id=npmrc,src=$HOME/.npmrc \
  -t web:secure .
```

In your Dockerfile, mount and use the secret during the RUN command. It exists only for that step.

```dockerfile
# Mount the secret at /root/.npmrc during this command only
# The secret is never written to any image layer
RUN --mount=type=secret,id=npmrc target=/root/.npmrc \
    npm publish
```

Now your source image remains clean, satisfying both auditors and future you.

## 4. Compose profiles keep local, staging, and prod in one file

Instead of juggling `docker-compose.dev.yml`, `*-prod.yml`, etc., define profiles and start only what each environment needs.

```yaml
services:
  db:
    image: postgres:16
    profiles: [core]           # Runs in all environments

  mailhog:
    image: mailhog/mailhog
    profiles: [dev]            # Only runs in development (email testing)

  worker:
    build: ./worker
    profiles: [core, prod]     # Runs in core and production environments
```

Run `docker compose --profile core --profile dev up` during development and `--profile core --profile prod up -d` in staging. One file, zero drift.

## 5. `buildx bake` lets you ship multi-arch binaries without CI spaghetti

When you need both amd64 and arm64 images (hello, Apple Silicon), `docker buildx bake` reads a declarative file and handles the matrix in parallel.

```hcl
// docker-bake.hcl - Declarative multi-platform build configuration
target "app" {
  context = "."                            // Build context directory
  dockerfile = "Dockerfile"                // Dockerfile to use
  platforms = ["linux/amd64", "linux/arm64"]  // Build for Intel and ARM
  tags = ["registry.example.com/app:latest"]  // Tag for the manifest list
}
```

`docker buildx bake app --push` now emits both variants and a manifest list, so Kubernetes pulls the right architecture automatically.

## 6. Healthchecks plus dependency awareness stop cascading startups

Add `HEALTHCHECK` directives and wire dependencies via Compose's `depends_on` with conditionals to avoid race conditions at launch.

This Dockerfile instruction tells Docker how to verify the container is ready to serve traffic.

```dockerfile
# Define how Docker should check if the container is healthy
# --interval=30s: Check every 30 seconds
# --timeout=5s: Give up if check takes longer than 5 seconds
# --retries=3: Mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
```

In your Compose file, use `condition: service_healthy` to wait for dependencies to be truly ready, not just started.

```yaml
services:
  api:
    depends_on:
      db:
        condition: service_healthy  # Wait for db's HEALTHCHECK to pass
```

Your orchestrator now waits for Postgres to pass its check before starting the API, preventing "works on my laptop" startup issues.

## 7. `docker scout cves` gives instant supply-chain feedback

Docker Scout plugs into Hub or private registries and surfaces CVEs without leaving your terminal.

```bash
# Scan an image for known vulnerabilities (CVEs)
# Shows severity levels, affected packages, and fix recommendations
docker scout cves my-api:latest
```

Combine Scout with the built-in SBOM export (`docker buildx imagetools inspect --format '{{json .SBOM}}'`) to feed your security scanners real dependency metadata.

## 8. Use `--init`, `--cap-drop`, and tmpfs for production-grade containers

PID 1 needs to reap zombies, and most workloads need fewer Linux capabilities than Docker grants by default.

```bash
docker run \
  --init \                              # Add tini init to reap zombie processes
  --cap-drop=ALL \                      # Remove all Linux capabilities
  --cap-add=NET_BIND_SERVICE \          # Add back only what's needed (bind to port < 1024)
  --read-only \                         # Make root filesystem read-only (security)
  --tmpfs /tmp:size=64m \               # Writable temp directory with size limit
  my-api:latest
```

These flags convert a "good enough" container into something you can actually defend during audits.

## 9. Debug prod parity locally with `docker run --network container:<id>`

Need to poke a service that only binds to localhost inside its container? Launch a one-off toolbox container that shares the target network namespace.

```bash
# Get the container ID of the running Redis container
TARGET=$(docker ps --filter name=redis -q)

# Launch a debug container sharing the target's network namespace
# nicolaka/netshoot: Popular image with networking debug tools
# 127.0.0.1 now refers to the Redis container's localhost
docker run -it --network container:$TARGET nicolaka/netshoot redis-cli -h 127.0.0.1
```

No port-forwards, no Compose edits, just instant shell access for diagnostics.

## 10. Stream Docker events to detect flapping containers

`docker events --filter type=container` is a real-time feed of start/stop cycles. Pipe it into `jq` or your observability stack to spot unhealthy workloads.

```bash
# Stream all Docker events as JSON and filter for container deaths
# --format '{{json .}}': Output as JSON for easy parsing
# jq 'select(.status=="die")': Show only container exit/crash events
docker events --format '{{json .}}' | jq 'select(.status=="die")'
```

For long-running hosts, forward critical events into OneUptime (or your incident manager of choice) so you do not learn about container churn from customer tickets.

---

Docker still evolves quickly - even seasoned operators miss out when they freeze their knowledge at `docker run`. Pick one or two of these superpowers each sprint, bake them into your Dockerfile or Compose templates, and you will ship leaner, safer containers without adding new tooling.
