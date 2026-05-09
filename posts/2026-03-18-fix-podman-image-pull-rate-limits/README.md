# How to Fix Podman Image Pull Rate Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Docker Hub, Rate Limiting, DevOps

Description: Learn how to work around Docker Hub and registry image pull rate limits in Podman using authentication, mirrors, caching strategies, and private registries.

---

> Docker Hub enforces pull rate limits that can break CI/CD pipelines and slow down deployments. This guide covers practical strategies to work around rate limits in Podman, from authentication to mirror configuration and local caching.

You run `podman pull` and get an error message about rate limits being exceeded. Docker Hub introduced pull rate limits that restrict how many image pulls you can make in a given time window. For anonymous users, the limit is 100 pulls per 6 hours per IPv4 address or IPv6 /64 subnet. For authenticated Docker Personal accounts, it is 200 pulls per 6 hours. These limits are easily hit in CI/CD environments where multiple pipelines pull images from the same IP.

Understanding these limits and knowing how to work around them is essential for maintaining reliable container workflows.

---

## Understanding Rate Limits

Docker Hub rate limits are based on your authentication status and account type:

- **Anonymous**: 100 pulls per 6 hours per IPv4 address or IPv6 /64 subnet
- **Authenticated (Docker Personal)**: 200 pulls per 6 hours
- **Docker Pro/Team/Business**: Unlimited pull rate, subject to Docker's fair use policy

The rate limit error in Podman looks like:

```text
Error: pulling image: Error response from registry: toomanyrequests: You have reached your pull rate limit.
```

You can check your current rate limit status:

```bash
# Check rate limit headers (anonymous)

podman run --rm docker.io/ratelimitpreview/test:latest

# Or use curl to check headers
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s -H "Authorization: Bearer $TOKEN" -I "https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest" 2>&1 | grep -i ratelimit
```

The response headers show:

```text
RateLimit-Limit: 100;w=21600
RateLimit-Remaining: 95;w=21600
```

This tells you: 100 pulls allowed per 21600 seconds (6 hours), with 95 remaining.

## Fix 1: Authenticate with Docker Hub

The simplest improvement is to authenticate. This doubles your pull limit from 100 to 200:

```bash
podman login docker.io
```

Enter your Docker Hub username and password (or access token). The credentials are stored in `~/.config/containers/auth.json` or `$XDG_RUNTIME_DIR/containers/auth.json`.

For CI/CD pipelines, use environment variables or secrets:

```bash
echo "$DOCKERHUB_TOKEN" | podman login docker.io -u "$DOCKERHUB_USERNAME" --password-stdin
```

For automated environments, create a Docker Hub access token instead of using your password:

1. Go to Docker Hub and navigate to Account Settings, then Security
2. Create a new access token
3. Use the token as the password in `podman login`

## Fix 2: Use a Registry Mirror

Set up a mirror to cache Docker Hub images locally or use a cloud provider's mirror. Edit `~/.config/containers/registries.conf` or `/etc/containers/registries.conf`:

```toml
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io/library"
location = "docker.io/library"

[[registry.mirror]]
location = "your-mirror.example.com/library"
```

The `docker.io/library` prefix covers Docker Official Images such as `nginx` and `alpine`. For images under another Docker Hub namespace, configure that namespace explicitly.

### Setting Up a Local Registry Mirror

Run a pull-through cache with Podman itself:

```bash
# Create a configuration file for the registry
mkdir -p /opt/registry-config

cat > /opt/registry-config/config.yml << 'EOF'
version: 0.1
proxy:
  remoteurl: https://registry-1.docker.io
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  cache:
    blobdescriptor: inmemory
  delete:
    enabled: true
  maintenance:
    uploadpurging:
      enabled: true
      age: 168h
      interval: 24h
http:
  addr: :5000
EOF

# Run the registry mirror
podman run -d \
  --name registry-mirror \
  -p 5000:5000 \
  -v /opt/registry-config/config.yml:/etc/docker/registry/config.yml:z \
  -v /opt/registry-data:/var/lib/registry:z \
  registry:2
```

Then configure Podman to use it:

```toml
[[registry]]
prefix = "docker.io/library"
location = "docker.io/library"

[[registry.mirror]]
location = "localhost:5000/library"
insecure = true
```

### Using Cloud Provider Mirrors

Major cloud providers offer Docker Hub mirrors:

**AWS ECR Public:**

```toml
[[registry]]
prefix = "docker.io/library"
location = "docker.io/library"

[[registry.mirror]]
location = "public.ecr.aws/docker/library"
```

**Google Artifact Registry cache:**

```toml
[[registry]]
prefix = "docker.io/library"
location = "docker.io/library"

[[registry.mirror]]
location = "mirror.gcr.io/library"
```

## Fix 3: Cache Images Locally

Avoid pulling the same image repeatedly by caching it locally.

**Save and load images:**

```bash
# Save an image to a tar file
podman save -o nginx-latest.tar docker.io/library/nginx:latest

# Load it on another machine or after pruning
podman load -i nginx-latest.tar
```

**Use a local registry for your team:**

```bash
# Run a local registry
podman run -d -p 5000:5000 --name local-registry registry:2

# Push commonly used images to it
podman pull docker.io/library/nginx:latest
podman tag docker.io/library/nginx:latest localhost:5000/nginx:latest
podman push localhost:5000/nginx:latest --tls-verify=false
```

## Fix 4: Reduce Pulls in CI/CD

Restructure your CI/CD pipelines to minimize image pulls:

**Cache base images across pipeline runs:**

```yaml
# GitHub Actions example
jobs:
  build:
    steps:
      - name: Cache Podman images
        uses: actions/cache@v4
        with:
          path: ~/.local/share/containers
          key: podman-images-${{ hashFiles('Dockerfile') }}

      - name: Build only if cache miss
        run: |
          if ! podman image exists my-base-image:latest; then
            podman pull my-base-image:latest
          fi
```

**Use specific tags instead of `latest`:**

```bash
# Bad - podman pull defaults to --policy=always
podman pull nginx:latest

# Good - use a specific tag and only pull it if it is missing locally
podman pull --policy=missing nginx:1.25.3-alpine
```

**Combine multiple images into a single base image:**

```dockerfile
# Instead of pulling 5 images in CI, use one custom base
FROM your-registry.com/ci-base:latest
# This image already has all the tools you need
```

## Fix 5: Use Alternative Registries

Many popular images are available on registries other than Docker Hub:

```bash
# Quay.io
podman pull quay.io/nginx/nginx-unprivileged:latest

# GitHub Container Registry
podman pull ghcr.io/linuxcontainers/alpine:latest

# Red Hat Registry
podman pull registry.access.redhat.com/ubi9/ubi:latest

# Google Container Registry
podman pull gcr.io/google-containers/pause:latest

# Amazon ECR Public
podman pull public.ecr.aws/nginx/nginx:latest
```

## Fix 6: Use Podman's Image Caching

Podman caches pulled images locally, but explicit `podman pull` defaults to `--policy=always`. Use `--policy=missing` or check whether the image exists locally before pulling:

```bash
# Check if an image exists locally before pulling
if ! podman image exists nginx:1.25; then
    podman pull nginx:1.25
fi
```

For CI/CD, preserve the image store between runs:

```bash
# Set a custom image store location that persists
export CONTAINERS_STORAGE_CONF=~/.config/containers/storage.conf

mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"
rootless_storage_path = "/persistent-storage/containers"
EOF
```

## Fix 7: Monitor and Track Usage

Track your pull count to avoid surprises:

```bash
#!/bin/bash
# check-rate-limit.sh
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

HEADERS=$(curl -s -H "Authorization: Bearer $TOKEN" -I "https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest" 2>&1)

LIMIT=$(echo "$HEADERS" | grep -i "ratelimit-limit" | awk '{print $2}')
REMAINING=$(echo "$HEADERS" | grep -i "ratelimit-remaining" | awk '{print $2}')

echo "Rate Limit: $LIMIT"
echo "Remaining: $REMAINING"
```

Run this before CI/CD pipelines to check if you have capacity. If remaining is low, switch to a mirror or wait.

## Fix 8: Upgrade Docker Hub Plan

For organizations with heavy pull requirements, a paid Docker Hub plan is the most straightforward solution. Docker Pro, Team, and Business plans offer unlimited pull rates, subject to Docker's fair use policy. For open-source projects, Docker offers sponsored open source program options.

## Complete CI/CD Strategy

Here is a comprehensive approach for CI/CD environments:

```bash
#!/bin/bash
# ci-image-pull.sh - Rate-limit-aware image pulling

IMAGE="$1"
LOCAL_REGISTRY="registry.internal.company.com:5000"

# Try local registry first (no rate limits)
if podman pull "${LOCAL_REGISTRY}/${IMAGE}" --tls-verify=false 2>/dev/null; then
    podman tag "${LOCAL_REGISTRY}/${IMAGE}" "${IMAGE}"
    echo "Pulled from local registry"
    exit 0
fi

# Try the configured mirror/source second
if podman pull "${IMAGE}" 2>/dev/null; then
    # Push to local registry for future use
    podman tag "${IMAGE}" "${LOCAL_REGISTRY}/${IMAGE}"
    podman push "${LOCAL_REGISTRY}/${IMAGE}" --tls-verify=false 2>/dev/null
    echo "Pulled from mirror/source, cached locally"
    exit 0
fi

echo "Failed to pull ${IMAGE}" >&2
exit 1
```

## Conclusion

Docker Hub rate limits are a reality of modern container workflows. Authenticate with Docker Hub for an immediate improvement, set up a registry mirror for caching, and use alternative registries when possible. In CI/CD environments, cache images between pipeline runs, use specific image tags, and consider a pull-through cache registry. Monitor your rate limit usage proactively so you are never caught off guard during a critical deployment. For organizations, a paid Docker Hub plan or a fully private registry eliminates the problem entirely.
