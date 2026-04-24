# How to View Image Details and Layers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Debugging, DevOps

Description: Learn how to inspect Docker image details, layers, and metadata in Portainer to understand image composition and diagnose issues.

## Introduction

Docker images are composed of stacked layers. Filesystem-changing Dockerfile instructions create new layers, while some instructions only modify image metadata. Understanding an image's layers helps optimize image size, debug build issues, and verify that images contain what you expect. Portainer provides image detail views, and this guide also covers CLI tools for deep layer inspection.

## Prerequisites

- Portainer installed with a connected Docker environment
- Docker images on the host to inspect

## Step 1: View Image Details in Portainer

1. Navigate to **Images** in Portainer.
2. Select the image you want to inspect.
3. View the image details page showing:
   - **Image ID**: Unique SHA256 identifier
   - **Tags**: All tags pointing to this image
   - **Size**: Image size reported by Docker
   - **Creation date**: When the image was built

Portainer versions and environments can differ, but image detail views commonly expose additional fields such as architecture, OS, and labels.

## Step 2: Inspect Image via Docker CLI

```bash
# Full JSON inspection:

docker inspect nginx:alpine

# Format specific fields:
docker inspect nginx:alpine --format '{{.Config.Env}}'
# Output: [PATH=/usr/local/sbin:... NGINX_VERSION=1.25.4]

docker inspect nginx:alpine --format '{{.Config.ExposedPorts}}'
# Output: map[80/tcp:{}]

docker inspect nginx:alpine --format '{{.Os}} / {{.Architecture}}'
# Output: linux / amd64

docker inspect nginx:alpine --format '{{.Created}}'
# Output: 2024-02-15T12:00:00Z

docker inspect nginx:alpine --format '{{len .RootFS.Layers}} layers'
# Output: 7 layers

# Get the image size:
docker image inspect nginx:alpine --format '{{.Size}}'
# Output: 42000000 (bytes)
```

## Step 3: View Image Layers

Image history entries often map to Dockerfile instructions, but only instructions that change the filesystem create actual layers:

```bash
# View image history (layers):
docker history nginx:alpine

# Output:
IMAGE          CREATED        CREATED BY                                COMMENT
abc123         2 weeks ago    CMD ["nginx" "-g" "daemon off;"]         buildkit
<missing>      2 weeks ago    STOPSIGNAL SIGQUIT
<missing>      2 weeks ago    EXPOSE 80
<missing>      2 weeks ago    ENTRYPOINT ["/docker-entrypoint.sh"]
<missing>      2 weeks ago    COPY 30-tune-worker-processes.sh /docke…
<missing>      2 weeks ago    RUN /bin/sh -c set -x...
<missing>      2 weeks ago    ENV NGINX_VERSION=1.25.4 PKG_RELEASE=1
<missing>      2 weeks ago    FROM alpine:3.19                         alpine base

# Show full command (not truncated):
docker history --no-trunc nginx:alpine

# Human-readable size:
docker history --human nginx:alpine
```

### What Each Layer Represents

```dockerfile
# Dockerfile instructions -> filesystem layers and metadata history:

FROM alpine:3.19            # Layer 1: Base OS (7 MB)
RUN apk add nginx           # Layer 2: Install nginx (15 MB)
COPY nginx.conf /etc/nginx/ # Layer 3: Config file (tiny)
RUN mkdir -p /var/log/nginx # Layer 4: Create dirs (tiny)
EXPOSE 80                   # No layer (metadata only)
CMD ["nginx", "-g", "daemon off;"] # No layer (metadata only)
```

## Step 4: Analyze Image Layers with Dive

For detailed layer analysis, use the `dive` tool:

```bash
# Run dive without installing it locally:
docker run --rm -it \
  -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive:latest nginx:alpine

# Navigate with arrow keys:
# Left panel: layers
# Right panel: file changes in each layer
# Tab: switch focus
# Space: collapse/expand directories
```

Dive shows:
- Layer sizes
- Files added/changed/deleted in each layer
- Wasted space (files deleted in later layers that were created earlier)
- Image efficiency score

## Step 5: Examine Image Labels

```bash
# View all image labels:
docker inspect nginx:alpine --format '{{json .Config.Labels}}' | jq .

# Output (example labels for a well-labeled image):
{
  "maintainer": "NGINX Docker Maintainers",
  "org.opencontainers.image.created": "2024-02-15T12:00:00Z",
  "org.opencontainers.image.revision": "abc123def456",
  "org.opencontainers.image.source": "https://github.com/nginxinc/docker-nginx",
  "org.opencontainers.image.title": "nginx",
  "org.opencontainers.image.url": "https://hub.docker.com/_/nginx",
  "org.opencontainers.image.version": "1.25.4"
}
```

Many images use OCI annotation keys as labels. Well-labeled images often include build date, source, revision, and version.

## Step 6: Check Image Environment and Entry Points

```bash
# Environment variables baked into the image:
docker inspect nginx:alpine --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}'

# Entry point and default command:
docker inspect nginx:alpine --format 'ENTRYPOINT: {{.Config.Entrypoint}}'
docker inspect nginx:alpine --format 'CMD: {{.Config.Cmd}}'

# Default user configured in the image:
docker inspect nginx:alpine --format 'USER: {{.Config.User}}'

# Default working directory:
docker inspect nginx:alpine --format 'WORKDIR: {{.Config.WorkingDir}}'

# Exposed ports:
docker inspect nginx:alpine --format '{{range $port, $v := .Config.ExposedPorts}}{{$port}}{{"\n"}}{{end}}'
```

## Step 7: Compare Two Image Versions

```bash
# Compare layer counts:
echo "v1 layers: $(docker image inspect myapp:v1 --format '{{len .RootFS.Layers}}')"
echo "v2 layers: $(docker image inspect myapp:v2 --format '{{len .RootFS.Layers}}')"

# Compare sizes:
docker images myapp --format "{{.Tag}}: {{.Size}}"

# Compare environment variables:
diff \
  <(docker inspect myapp:v1 --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' | sort) \
  <(docker inspect myapp:v2 --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' | sort)
```

## Step 8: Identify Image Issues

Common issues you can spot during image inspection:

```bash
# Large image? Find the biggest history entries by size:
docker image history --human --format '{{.Size}}\t{{.CreatedBy}}' myapp:latest | sort -h | tail -5

# Potential secrets baked into image config? Check env vars:
docker inspect myapp:latest --format '{{.Config.Env}}' | grep -i "password\|secret\|key"

# Running as root? (Security issue)
USER=$(docker inspect myapp:latest --format '{{.Config.User}}')
[ -z "$USER" ] && echo "WARNING: Running as root (no USER set)"

# Check for unnecessary packages (Alpine/Debian-based images):
docker run --rm myapp:latest sh -c "apk list 2>/dev/null || dpkg -l 2>/dev/null" | wc -l
```

## Conclusion

Viewing image details and layers in Portainer and Docker CLI gives you a complete picture of what's inside a container image - its layers, environment variables, entry points, labels, and metadata. This information is essential for optimizing image sizes (reducing layers and removing unnecessary files), debugging startup issues (checking CMD and ENTRYPOINT), and auditing security (verifying no secrets in environment variables, checking the running user).
