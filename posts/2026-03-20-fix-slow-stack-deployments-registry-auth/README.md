# How to Fix Slow Stack Deployments Due to Registry Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Performance, Registry, Authentication, Docker Pull

Description: Learn how to fix slow stack deployments in Portainer caused by registry authentication delays, including credential caching, pull policy settings, and local registry mirrors.

---

Stack deployments that take minutes instead of seconds are often blocked on image pulls with slow registry authentication. This guide identifies the bottleneck and provides fixes.

## Step 1: Identify if the Delay is in Authentication

```bash
# Manually time an image pull to isolate the issue

time docker pull <image-name>:<tag>

# If the first few seconds are silent before layer output starts,
# the delay is often in registry reachability, TLS, or authentication
```

## Step 2: Test Registry Latency

```bash
# Test Docker Hub's authentication endpoint latency
time curl -s -o /dev/null -w "%{time_total}" \
  https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/ubuntu:pull

# For private registries, test the registry API endpoint first.
# A 401 response with WWW-Authenticate is normal on authenticated registries.
time curl -s -o /dev/null -w "%{time_total}" \
  https://your-registry.example.com/v2/
```

## Step 3: Pre-pull Images Before Deployment

For frequently deployed images, pre-pull them so Docker can reuse the local cache:

```bash
# On multi-node environments, pre-pull on every node that may run the service
docker pull myapp:1.2.3
docker pull postgres:16-alpine
docker pull redis:7-alpine

# Then deploy the stack. This can avoid layer downloads,
# although Docker Swarm may still contact the registry to resolve image metadata
```

## Step 4: Avoid Forced Re-pulls in Portainer

For development environments where images do not change often, leave Portainer's **Re-pull image** option disabled when updating the stack. On Docker Standalone stacks, you can also use Compose pull policies. This does not apply to Docker Swarm stacks, which Portainer deploys with `docker stack deploy`.

```yaml
version: "3.8"
services:
  app:
    image: myapp:1.2.3
    # Never pull if the image already exists locally
    pull_policy: never
```

## Step 5: Set Up a Local Registry Mirror

A local registry mirror caches Docker Hub images on your network:

```yaml
# Deploy a registry mirror
version: "3.8"
services:
  registry-mirror:
    image: registry:3
    ports:
      - "5000:5000"
    environment:
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
    volumes:
      - registry_mirror:/var/lib/registry

volumes:
  registry_mirror:
```

Configure each Docker daemon to use the mirror in `/etc/docker/daemon.json`:

```json
{
  "registry-mirrors": ["http://<mirror-host>:5000"]
}
```

## Step 6: Cache Registry Credentials

For private registries, ensure credentials are stored so Docker can authenticate without prompting every time:

```bash
# Log in once so Docker can reuse stored credentials
docker login registry.example.com

# Docker stores credentials in the configured credential store
# If no credential store is configured, they are stored in ~/.docker/config.json
```

In Portainer, registries added under **Registries** can be used for image pulls during deployment.
