# How to Use Docker History to Understand Image Build Steps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker history, images, layers, debugging, optimization, dockerfile

Description: Learn how to use docker history to inspect image layers, debug builds, and optimize Docker image size.

---

Every Docker image is a stack of layers. Each instruction in your Dockerfile creates a new layer, and those layers accumulate into the final image. The `docker history` command lets you peel back those layers and see exactly what each build step contributed. You can find out which step added the most size, what commands ran during the build, and when something was created.

This is invaluable for debugging build issues, optimizing image size, and understanding third-party images you did not build yourself.

## Basic Usage

The simplest invocation shows the layer history of any image:

```bash
# View the build history of the nginx image
docker history nginx:latest
```

Output looks like this:

```
IMAGE          CREATED       CREATED BY                                      SIZE      COMMENT
3b25b682ea82   2 weeks ago   CMD ["nginx" "-g" "daemon off;"]                0B        buildkit
<missing>      2 weeks ago   STOPSIGNAL SIGQUIT                              0B        buildkit
<missing>      2 weeks ago   EXPOSE map[80/tcp:{}]                           0B        buildkit
<missing>      2 weeks ago   ENTRYPOINT ["/docker-entrypoint.sh"]            0B        buildkit
<missing>      2 weeks ago   COPY 30-tune-worker-processes.sh /docker-en...  4.62kB    buildkit
<missing>      2 weeks ago   COPY 20-envsubst-on-templates.sh /docker-en..   3.02kB    buildkit
<missing>      2 weeks ago   COPY 15-local-resolvers.envsh /docker-entry..   336B      buildkit
<missing>      2 weeks ago   COPY 10-listen-on-ipv6-by-default.sh /docke..   2.12kB    buildkit
<missing>      2 weeks ago   COPY docker-entrypoint.sh / # buildkit          1.62kB    buildkit
<missing>      2 weeks ago   RUN /bin/sh -c set -x     && groupadd MDash...  112MB     buildkit
<missing>      2 weeks ago   ENV DYNPKG_RELEASE=2~bookworm                   0B        buildkit
```

Each row is a layer. The `CREATED BY` column shows the Dockerfile instruction, `SIZE` shows how much that layer added, and `IMAGE` shows the layer ID.

## Understanding the Output Columns

The columns tell you specific things:

- **IMAGE**: The layer's short ID. Layers from the base image show as `<missing>` because Docker does not store their IDs locally after pulling.
- **CREATED**: When the layer was built. Useful for knowing if you are looking at a stale build.
- **CREATED BY**: The Dockerfile instruction that created this layer. This is the most informative column.
- **SIZE**: How many bytes this layer added to the image. Zero-byte layers come from metadata instructions like `ENV`, `EXPOSE`, and `CMD`.
- **COMMENT**: Usually shows `buildkit` for images built with BuildKit.

## Seeing Full Commands with --no-trunc

The default output truncates long commands. Use `--no-trunc` to see the complete instruction:

```bash
# Show complete, untruncated commands for each layer
docker history --no-trunc nginx:latest
```

This is essential when debugging because the truncated output often hides the important parts of `RUN` commands. The full output can be very wide, so you might want to pipe it:

```bash
# View full history in a pager for easier reading
docker history --no-trunc nginx:latest | less -S
```

## Formatting Output

Use Go templates for custom output formatting.

Show only the instruction and size for each layer:

```bash
# Display only the command and size for each layer
docker history --format "{{.CreatedBy}}\t{{.Size}}" nginx:latest
```

Get a JSON-formatted output for scripting:

```bash
# Output history as JSON for programmatic processing
docker history --format json nginx:latest
```

Show a clean table with specific columns:

```bash
# Custom table format with layer ID, size, and creation command
docker history --format "table {{.ID}}\t{{.Size}}\t{{.CreatedBy}}" nginx:latest
```

## Finding the Largest Layers

Identifying which layers contribute the most to image size is the first step in optimization.

Sort layers by size to find the biggest contributors:

```bash
# List layers sorted by size, largest first
docker history nginx:latest --format "{{.Size}}\t{{.CreatedBy}}" --no-trunc | sort -hr
```

For a more readable approach, use the quiet flag with inspect:

```bash
# Show only layers that added more than 0 bytes
docker history nginx:latest --format "{{.Size}}\t{{.CreatedBy}}" | grep -v "^0B"
```

## Comparing Two Image Versions

When an image suddenly gets larger, compare the history of two versions to find what changed.

Pull both versions and compare:

```bash
# Compare layer sizes between two image tags
echo "=== Version 1.24 ===" && \
docker history nginx:1.24 --format "{{.Size}}\t{{.CreatedBy}}" | head -20

echo "=== Version 1.25 ===" && \
docker history nginx:1.25 --format "{{.Size}}\t{{.CreatedBy}}" | head -20
```

For your own images, compare before and after a change:

```bash
# Tag the current image before rebuilding
docker tag myapp:latest myapp:before-optimization

# After rebuilding, compare sizes
docker history myapp:before-optimization --format "{{.Size}}\t{{.CreatedBy}}" | head -10
echo "---"
docker history myapp:latest --format "{{.Size}}\t{{.CreatedBy}}" | head -10
```

## Debugging Build Cache Issues

`docker history` reveals whether layers were cached or rebuilt. The `CREATED` timestamp tells you when each layer was actually built.

```bash
# Check timestamps to see which layers were rebuilt vs cached
docker history myapp:latest --format "table {{.CreatedSince}}\t{{.Size}}\t{{.CreatedBy}}"
```

If a layer that should have been cached shows a recent timestamp, something invalidated the cache. Common causes include:

- A `COPY` instruction earlier in the Dockerfile where the source files changed
- A build argument that changed, invalidating all downstream layers
- Docker BuildKit pruning the cache

## Using History to Reverse-Engineer a Dockerfile

When you pull an image and want to understand how it was built, `docker history` reconstructs the Dockerfile instructions:

```bash
# Reconstruct the Dockerfile from an image's history
docker history --no-trunc --format "{{.CreatedBy}}" myimage:latest
```

This shows every instruction in reverse order (most recent first). Flip it to get the original order:

```bash
# Show build steps in Dockerfile order (oldest first)
docker history --no-trunc --format "{{.CreatedBy}}" myimage:latest | tac
```

Note that this does not perfectly reconstruct the Dockerfile. Multi-line `RUN` commands appear as a single line with `&&` separators. `ARG` instructions used during the build are not always visible. But it gives you a strong understanding of what the image contains.

## Analyzing Multi-Stage Build Results

Multi-stage builds only include layers from the final stage. Use `docker history` to verify that intermediate build artifacts were not accidentally copied:

```bash
# Verify that the production image only contains runtime dependencies
docker history myapp:production --format "{{.Size}}\t{{.CreatedBy}}" --no-trunc
```

If you see layers with `go build`, `npm run build`, or `apt-get install build-essential` in the production image, your multi-stage build is not configured correctly. Those should only appear in the builder stage.

Compare the builder stage image with the production image:

```bash
# Build and tag both stages separately
docker build --target builder -t myapp:builder .
docker build -t myapp:production .

# Compare their sizes
docker images myapp
```

## Practical Optimization Workflow

Here is a step-by-step process for using `docker history` to optimize an image.

Start with the current image size:

```bash
# Check the total image size
docker images myapp:latest --format "{{.Repository}}:{{.Tag}} - {{.Size}}"
```

Identify the largest layers:

```bash
# Find the biggest layers to target for optimization
docker history myapp:latest --format "{{.Size}}\t{{.CreatedBy}}" --no-trunc | sort -hr | head -5
```

Common findings and fixes:

1. **Large `RUN apt-get install` layers**: Combine install and cleanup in the same RUN instruction to avoid storing package cache in a layer.

```dockerfile
# Bad - package cache stored in a separate layer
RUN apt-get update
RUN apt-get install -y python3
RUN rm -rf /var/lib/apt/lists/*

# Good - single layer with cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 && \
    rm -rf /var/lib/apt/lists/*
```

2. **Unnecessary files copied**: Use a `.dockerignore` file to exclude test files, documentation, and version control data.

```
# .dockerignore - Exclude files that bloat the image
.git
node_modules
tests
docs
*.md
.env
```

3. **Development dependencies in production images**: Use multi-stage builds to separate build tools from runtime.

After making changes, rebuild and compare:

```bash
# Rebuild and check the new layer sizes
docker build -t myapp:optimized .
docker history myapp:optimized --format "{{.Size}}\t{{.CreatedBy}}" --no-trunc | head -10

# Compare total sizes
docker images --format "{{.Repository}}:{{.Tag}}\t{{.Size}}" | grep myapp
```

## Inspecting Base Image Layers

Sometimes the base image itself is the problem. Check what the base image contributes:

```bash
# See how large the base image is before your customizations
docker history python:3.12 --format "{{.Size}}\t{{.CreatedBy}}" | head -5
```

Consider switching to slimmer base images:

```bash
# Compare base image sizes
docker pull python:3.12
docker pull python:3.12-slim
docker pull python:3.12-alpine

docker images python --format "table {{.Tag}}\t{{.Size}}"
```

Typical output:

```
TAG           SIZE
3.12          1.02GB
3.12-slim     155MB
3.12-alpine   58.5MB
```

## Summary

`docker history` is a diagnostic tool that reveals the internal structure of any Docker image. Use it to find large layers that inflate image size, verify that multi-stage builds exclude build artifacts, reverse-engineer Dockerfiles from third-party images, and debug cache invalidation during builds. Combine `--no-trunc` with `--format` for the most useful output. Make it a habit to check `docker history` after every build to catch size regressions early.
