# How to Fix Slow Stack Deployments Due to Registry Authentication - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Performance, Registry, Troubleshooting, Stack

Description: Speed up slow Portainer stack deployments caused by registry authentication timeouts, DNS resolution delays, and inefficient image pull strategies.

## Introduction

Stack deployments in Portainer can become extremely slow when registry authentication takes long - 30+ seconds or more for each image pull. This is commonly caused by DNS resolution delays for registry servers, stale authentication tokens, or pull-always policies on large images. This guide explains how to diagnose and fix each bottleneck.

## Step 1: Identify the Bottleneck

```bash
# Time a manual image pull to measure the actual bottleneck

time docker pull myregistry.com/myimage:v1.0

# Compare stages:
# - "Pulling from..." appearing quickly = auth is fast
# - Long pause before "Pulling from..." = DNS/auth is the bottleneck
# - "Pulling fs layer" is slow = network bandwidth issue
# - "Waiting" messages = rate limiting or concurrent pull throttling
```

## Step 2: Test DNS Resolution Speed

```bash
# Check how long DNS takes for your registry
time nslookup myregistry.com

# Check from inside Docker (may use different DNS)
docker run --rm busybox sh -c 'time nslookup myregistry.com'

# If DNS is slow, configure a faster resolver
cat /etc/resolv.conf

# Set Docker to use a fast DNS (e.g., Cloudflare or Google)
cat > /etc/docker/daemon.json << 'EOF'
{
  "dns": ["1.1.1.1", "8.8.8.8"],
  "dns-search": []
}
EOF

sudo systemctl restart docker
```

## Step 3: Pre-authenticate to Registries

Authentication happens at pull time. Pre-authentication caches credentials:

```bash
# Pre-authenticate to Docker Hub
docker login

# Pre-authenticate to custom registry
printf '%s\n' 'password' | docker login myregistry.com \
  --username username --password-stdin

# Pre-authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Docker stores login configuration in ~/.docker/config.json
# and may use an external credential store if configured
cat ~/.docker/config.json
```

## Step 4: Configure Portainer Registry Credentials

Ensure Portainer has valid, non-expired credentials:

1. Go to **Registries** in Portainer
2. Edit each registry and confirm the stored credentials are still valid
3. For ECR: use the **AWS ECR** registry type with IAM credentials and region; Portainer refreshes the temporary ECR auth token automatically

```bash
#!/bin/bash
# Update an existing AWS ECR registry entry in Portainer
# update-portainer-ecr.sh

PORTAINER_URL="https://portainer.example.com:9443"
PORTAINER_API_KEY="your-portainer-api-key"
REGISTRY_NAME="AWS ECR Production"
ECR_REGISTRY="123456789.dkr.ecr.us-east-1.amazonaws.com"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_REGION="us-east-1"

# Find the ECR registry ID in Portainer
REGISTRY_ID=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/api/registries" | \
  jq -r ".[] | select(.URL == \"$ECR_REGISTRY\" and .Type == 7) | .Id")

# Update the registry with IAM credentials.
# Portainer retrieves and refreshes the short-lived ECR auth token as needed.
curl -s -X PUT \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/registries/$REGISTRY_ID" \
  -d "$(jq -n \
    --arg name "$REGISTRY_NAME" \
    --arg url "$ECR_REGISTRY" \
    --arg user "$AWS_ACCESS_KEY_ID" \
    --arg pass "$AWS_SECRET_ACCESS_KEY" \
    --arg region "$AWS_REGION" \
    '{Name:$name, URL:$url, Authentication:true, Username:$user, Password:$pass, Ecr:{Region:$region}}')"
```

## Step 5: Enable Local Image Cache

For frequently used images, pull them locally before deployment:

```bash
# Pre-pull images on the Docker host before deploying stacks
docker pull myregistry.com/myapp:v1.0
docker pull postgres:16
docker pull redis:7.2

# Now stack deployments use the local cache (near-instant)
```

Configure Portainer stacks to not always re-pull:
1. In stack deployment settings, uncheck **Re-pull image**
2. This uses the local cache if the image exists

## Step 6: Use a Local Registry Mirror

Set up a pull-through cache registry to mirror Docker Hub:

```bash
# Deploy a registry mirror
docker run -d \
  -p 6000:5000 \
  --name registry-mirror \
  --restart always \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -v registry_mirror_data:/var/lib/registry \
  registry:3

# Configure Docker to use the mirror
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": ["http://localhost:6000"]
}
EOF

sudo systemctl restart docker

# Now all Docker Hub pulls go through local cache
docker pull nginx:latest  # Uses local mirror cache
```

## Step 7: Optimize Stack Deploy for Multi-Image Stacks

For stacks with many services, you can increase Compose's parallelism when pre-pulling images outside Portainer:

```bash
# Increase Compose parallelism for faster multi-image pulls
cd /opt/stacks/mystack
docker compose --parallel 8 pull

# After pre-pulling, deploy in Portainer with Re-pull disabled
```

## Step 8: Configure Image Pull Parallelism in Docker

```bash
# Docker daemon defaults to 3 concurrent layer downloads per pull
cat > /etc/docker/daemon.json << 'EOF'
{
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5
}
EOF

sudo systemctl restart docker
```

## Step 9: Use Image Digest Pinning

Pinned digests make deployments deterministic and avoid surprises from mutable tags:

```yaml
# Instead of mutable tag-based references
image: nginx:latest

# Use digest references for deterministic pulls
image: nginx@sha256:abc123...definite_hash_here
```

```bash
# Get the digest for a specific tag
docker pull nginx:latest
docker inspect nginx:latest --format='{{index .RepoDigests 0}}'
```

## Step 10: Monitor Pull Times with Portainer Logs

```bash
# Monitor deployment timing in Portainer
docker logs portainer 2>&1 | grep -i "pull\|registry\|image" | tail -30

# Time the full stack deployment
time docker compose -f /opt/stacks/mystack/docker-compose.yml pull
time docker compose -f /opt/stacks/mystack/docker-compose.yml up -d
```

## Conclusion

Slow stack deployments due to registry authentication are most commonly caused by DNS resolution delays and expired or missing authentication tokens. The fastest fixes are configuring fast DNS resolvers in the Docker daemon, pre-pulling images to warm the local cache, and setting up a local registry mirror for frequently used base images. For private registries, ensure Portainer's stored credentials are current. For AWS ECR, configure the registry with IAM credentials so Portainer can refresh the temporary token automatically.
