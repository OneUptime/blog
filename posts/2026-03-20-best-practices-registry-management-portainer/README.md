# Best Practices for Registry Management in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Registry, Container Image, Security, Best Practice, CI/CD

Description: Manage Docker image registries in Portainer securely with proper credential storage, registry access policies, image scanning, and pull policies for production deployments.

---

Container registries are where your application images live. Managing them correctly in Portainer involves secure credential storage, access policies, and image hygiene practices that prevent security incidents and deployment failures.

## Registry Types Supported

Portainer supports multiple registry types:

- Docker Hub (public and private)
- Custom Docker registries that support the Docker Registry API v2 (including self-hosted registries and services such as Google Artifact Registry)
- AWS ECR (Elastic Container Registry)
- Azure Container Registry (ACR)
- GitLab Container Registry
- ProGet
- Quay.io
- GitHub Container Registry (GHCR)

## Adding a Registry Securely

Add registries via **Registries > Add Registry**. For credentials:

```bash
# Do NOT use personal credentials for shared Portainer instances

# Create a dedicated service account/robot account in your registry

# Docker Hub: Create a Personal Access Token (not your password)
# ECR: Create an IAM user for Portainer with registry permissions
# GHCR: If using Portainer's GitHub registry provider, use a classic GitHub Personal Access Token with write:packages, delete:packages, and repo scopes
# Private registry: Create a robot account with read-only access
```

For AWS ECR, credentials rotate every 12 hours. Use the Portainer ECR registry type which handles token refresh automatically.

## Registry Access Controls

Registry access is scoped to the selected environment:

1. Go to **Host/Swarm/Cluster > Registries**
2. Select **Manage access** for the registry
3. Grant specific users or teams access

This prevents developers from deploying arbitrary images from Docker Hub in production.

## Self-Hosted Registry Deployment

Deploy a private registry alongside Portainer for complete control:

```yaml
# private-registry-stack.yml
services:
  registry:
    image: registry:3
    environment:
      - REGISTRY_AUTH=htpasswd
      - REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd
      - REGISTRY_AUTH_HTPASSWD_REALM=Registry
      - REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt
      - REGISTRY_HTTP_TLS_KEY=/certs/registry.key
      # Example for S3-backed storage (additional S3 configuration is required)
      # - REGISTRY_STORAGE=s3
      # - REGISTRY_STORAGE_S3_BUCKET=my-registry
    volumes:
      - /opt/registry/data:/var/lib/registry
      - /opt/registry/auth:/auth:ro
      - /opt/registry/certs:/certs:ro
    ports:
      - "5000:5000"
    restart: unless-stopped
```

## Image Scanning

Use your registry or CI/CD pipeline to scan images before deployment:

1. Enable image vulnerability scanning in your registry or pipeline
2. Review scan results before deploying through Portainer
3. Set policy: fail builds or promotions on CRITICAL vulnerabilities

## Pull Policies

Set appropriate pull policies in your stacks:

```yaml
services:
  prod-app:
    image: myregistry/app:stable
    pull_policy: always    # Pull on every container start

  dev-app:
    image: mydev-registry/app:dev
    pull_policy: missing   # Reuse the local image when present
```

## Image Pruning

Schedule regular image cleanup to manage disk space:

```bash
#!/bin/bash
# image-prune.sh - run as a Portainer scheduled job

# Remove dangling images (untagged layers)
docker image prune -f

# Remove images not used by any container (be careful in production)
# docker image prune -af --filter "until=168h"  # Older than 7 days

echo "Image cleanup complete. Disk usage:"
docker system df
```

## Registry Mirror for Bandwidth Optimization

Set up a registry pull-through cache to reduce Docker Hub bandwidth:

```yaml
# registry-mirror-stack.yml
services:
  registry-mirror:
    image: registry:3
    environment:
      # Configure as a pull-through cache for Docker Hub
      - REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io
      - REGISTRY_DELETE_ENABLED=true
      - REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt
      - REGISTRY_HTTP_TLS_KEY=/certs/registry.key
    volumes:
      - registry-mirror-data:/var/lib/registry
      - /opt/registry-mirror/certs:/certs:ro
    ports:
      - "5001:5000"

volumes:
  registry-mirror-data:
```

Configure Docker daemon on your hosts to use the mirror:

```json
// /etc/docker/daemon.json
{
  "registry-mirrors": ["https://your-mirror.example.com:5001"]
}
```

## Summary

Registry management in Portainer requires dedicated service accounts for credentials, access policies to restrict deployment sources, image scanning to catch vulnerabilities, and regular cleanup to manage disk usage. These practices prevent supply chain attacks and keep your image infrastructure lean.
