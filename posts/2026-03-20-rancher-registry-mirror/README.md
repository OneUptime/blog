# How to Set Up Registry Mirroring in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Container Registry, Mirroring, Performance

Description: Configure registry mirroring in Rancher to speed up image pulls, reduce external bandwidth, and improve cluster reliability in restricted or air-gapped environments.

## Introduction

Registry mirroring creates a local cache or proxy of a container registry, reducing pull times and external network usage. In Rancher-managed clusters, configuring mirrors ensures that frequently used images are served locally, improving pod startup times and reducing dependency on external registries. This is especially valuable for air-gapped deployments or environments with limited internet bandwidth.

## Prerequisites

- Rancher managing RKE2 or K3s clusters
- A local registry (Harbor, Docker Registry, or Nexus)
- SSH access to cluster nodes (for direct configuration)
- kubectl access to your cluster

## Step 1: Understanding Registry Mirroring

Registry mirroring works as a pull-through cache. When a node requests an image:
1. The node checks the mirror first.
2. If found, the mirror returns the cached image.
3. If not, the mirror fetches from the upstream registry, caches it, and returns it.

## Step 2: Set Up a Local Registry Mirror with Docker Registry

```bash
# Deploy a pull-through cache for Docker Hub using Docker Registry

docker run -d \
  --restart=always \
  --name registry-mirror \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -v /data/registry-mirror:/var/lib/registry \
  -p 5000:5000 \
  registry:3
```

If you need to cache private Docker Hub images, add `REGISTRY_PROXY_USERNAME` and `REGISTRY_PROXY_PASSWORD` and secure the mirror accordingly. Docker Distribution supports only one upstream registry per pull-through cache instance, so run a separate mirror instance for each upstream registry you want to cache.

## Step 3: Configure Mirroring in RKE2

Create the registries configuration on each RKE2 node:

```yaml
# /etc/rancher/rke2/registries.yaml - RKE2 registry mirror config
mirrors:
  "docker.io":
    endpoint:
      - "http://registry-mirror.internal:5000"
```

RKE2 still tries the registry's default endpoint as a last resort unless you disable default endpoint fallback.

Restart RKE2 to apply changes:

```bash
# Apply on server nodes
sudo systemctl restart rke2-server

# Apply on agent nodes
sudo systemctl restart rke2-agent
```

## Step 4: Configure Mirroring in K3s

```yaml
# /etc/rancher/k3s/registries.yaml - K3s registry mirror config
mirrors:
  "docker.io":
    endpoint:
      - "http://registry-mirror.internal:5000"
```

```bash
# Restart K3s server nodes
sudo systemctl restart k3s

# Restart K3s agent nodes
sudo systemctl restart k3s-agent
```

## Step 5: Deploy a Harbor Mirror with Helm

Deploy Harbor as a comprehensive mirror/registry using Helm:

```yaml
# harbor-mirror-values.yaml - Harbor as pull-through cache
expose:
  type: ingress
  ingress:
    hosts:
      core: harbor.internal

externalURL: https://harbor.internal

# Configure outbound proxy settings if Harbor needs an HTTP/HTTPS proxy
proxy:
  httpProxy: ""
  httpsProxy: ""
  noProxy: "127.0.0.1,localhost,.local,.internal"

persistence:
  persistentVolumeClaim:
    registry:
      size: 200Gi  # Size based on expected cached images
```

```bash
helm repo add harbor https://helm.goharbor.io
helm repo update
helm install harbor harbor/harbor \
  --namespace harbor \
  --create-namespace \
  --values harbor-mirror-values.yaml
```

## Step 6: Create a Proxy Cache Project in Harbor

```bash
# Create a proxy cache for Docker Hub via Harbor API
curl -X POST "https://harbor.internal/api/v2.0/registries" \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "name": "docker-hub-proxy",
    "type": "docker-hub",
    "url": "https://hub.docker.com",
    "credential": {
      "type": "basic",
      "access_key": "myusername",
      "access_secret": "mypassword"
    },
    "insecure": false,
    "description": "Docker Hub proxy cache"
  }'

# Create a proxy project
# Replace 1 with the registry ID returned by Harbor for docker-hub-proxy
curl -X POST "https://harbor.internal/api/v2.0/projects" \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "project_name": "dockerhub",
    "registry_id": 1,
    "metadata": {
      "public": "true",
      "auto_scan": "true"
    }
  }'
```

Now configure RKE2 to use Harbor as a mirror:

```yaml
# /etc/rancher/rke2/registries.yaml - Using Harbor as mirror
mirrors:
  "docker.io":
    endpoint:
      - "https://harbor.internal"
    rewrite:
      "^(.*)$": "dockerhub/$1"
configs:
  "harbor.internal":
    tls:
      ca_file: /etc/ssl/certs/harbor-ca.crt
    auth:
      username: robot$puller
      password: <robot-token>
```

## Step 7: Verify Mirror is Working

```bash
# Pull an image and check if it was served from the mirror
export CRI_CONFIG_FILE=/var/lib/rancher/rke2/agent/etc/crictl.yaml
/var/lib/rancher/rke2/bin/crictl pull docker.io/library/nginx:latest

# Check the containerd log on the node where the pull ran
grep -i "docker.io\\|harbor.internal\\|registry-mirror.internal" /var/lib/rancher/rke2/agent/containerd/containerd.log

# Check which repositories have been cached in the Harbor proxy project
curl -s "https://harbor.internal/api/v2.0/projects/dockerhub/repositories" \
  -u admin:password | jq '.[].name'
```

## Step 8: Configure Automated Warming (Pre-caching)

Pre-populate the mirror with commonly used images:

```bash
#!/bin/bash
# warm-cache.sh - Pre-cache commonly used images in mirror

MIRROR="harbor.internal/dockerhub"
IMAGES=(
  "library/nginx:1.25"
  "library/alpine:3.18"
  "library/busybox:latest"
  "library/redis:7"
  "library/postgres:15"
)

for IMAGE in "${IMAGES[@]}"; do
  echo "Warming cache for: $IMAGE"
  docker pull $MIRROR/$IMAGE
done
```

## Troubleshooting

```bash
# Check the rendered containerd mirror configuration
grep -A 10 "registry-mirror.internal" /var/lib/rancher/rke2/agent/etc/containerd/config.toml

# Test mirror connectivity
curl -I http://registry-mirror.internal:5000/v2/

# Check containerd logs
tail -f /var/lib/rancher/rke2/agent/containerd/containerd.log | grep -i "registry\|mirror\|pull"
```

## Conclusion

Registry mirroring significantly improves cluster reliability and performance by reducing dependency on external registries and cutting down image pull times. For production environments, deploy Harbor as a comprehensive mirror solution that provides additional features like vulnerability scanning and access control. By default, RKE2 and K3s still try the registry's default endpoint unless that fallback has been disabled, so test how that behavior fits restricted or air-gapped environments.
