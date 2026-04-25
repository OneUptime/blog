# How to Add a Custom Private Registry to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Registry, Private Registry, DevOps

Description: Learn how to add and configure a custom private container registry in Portainer for pulling images from self-hosted or corporate registries.

## Introduction

Organizations often run their own container registries for security, compliance, or latency reasons. Portainer supports adding custom private registries - whether self-hosted with Docker Registry, Harbor, Nexus Repository, or any other OCI-compliant registry. This guide covers configuring custom private registries in Portainer.

## Prerequisites

- Portainer CE or BE installed
- A running private registry with accessible URL
- Registry credentials (username/password or token)
- Admin access to Portainer

## Common Private Registry Options

| Registry | Notes |
|---------|-------|
| Docker Registry v2 | Simple, official Docker image |
| Harbor | Full-featured with RBAC and scanning |
| Nexus Repository | Maven + Docker + npm in one tool |
| JFrog Artifactory | Enterprise registry solution |
| Gitea + Package Registry | Built into Gitea |
| Self-hosted Docker Registry | Minimal footprint |

## Step 1: Deploy a Simple Private Registry (if needed)

If you don't already have a registry, deploy one quickly:

This example uses HTTPS with basic auth, since Docker does not support basic auth on an insecure HTTP registry.

```yaml
# registry.yml

services:
  registry:
    image: registry:3
    ports:
      - "443:443"
    environment:
      REGISTRY_HTTP_ADDR: 0.0.0.0:443
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
    volumes:
      - registry-data:/var/lib/registry
      - /opt/registry/auth:/auth
      - /opt/registry/certs:/certs

volumes:
  registry-data:
```

```bash
# Create registry credentials and place your TLS certificate and key in
# /opt/registry/certs/domain.crt and /opt/registry/certs/domain.key
mkdir -p /opt/registry/auth /opt/registry/certs
docker run --rm --entrypoint htpasswd httpd:2 \
  -Bbn registryuser strongpassword > /opt/registry/auth/htpasswd

# Start registry
docker compose -f registry.yml up -d
```

## Step 2: Add the Custom Registry in Portainer

1. In Portainer, click **Registries** in the sidebar
2. Click **+ Add registry**
3. Select **Custom registry**

## Step 3: Fill in Registry Details

```text
Name:       My Private Registry
URL:        registry.company.com         (or IP:port like 10.0.0.5:5000)

Authentication:
  [x] Use authentication
  Username:   registryuser
  Password:   strongpassword
```

For registries using a different port:

```text
URL: registry.company.com:5000
```

For insecure (HTTP) registries used only for isolated testing and without basic auth, enter the full URL in Portainer and configure the Docker daemon:

```text
URL: http://registry.company.com:5000
```

```json
// /etc/docker/daemon.json on all Docker hosts
{
  "insecure-registries": ["registry.company.com:5000"]
}
```

Docker does not support basic auth on insecure registries, so use HTTPS for authenticated private registries.

4. Click **Add registry**

## Step 4: Configure TLS for HTTPS Registries

For production, always use HTTPS. If using a self-signed certificate:

```bash
# Add the CA cert to the Docker daemon on each host
# If the registry uses a non-default port, include it in the directory name
sudo mkdir -p /etc/docker/certs.d/registry.company.com
sudo cp ca.crt /etc/docker/certs.d/registry.company.com/ca.crt
```

Or configure the daemon to trust the CA system-wide (Debian/Ubuntu example):

```bash
sudo cp ca.crt /usr/local/share/ca-certificates/company-registry.crt
sudo update-ca-certificates
sudo systemctl restart docker
```

## Step 5: Push and Pull Images

```bash
# Tag an image for your private registry
docker tag myapp:latest registry.company.com/team/myapp:latest

# Push to private registry
docker push registry.company.com/team/myapp:latest

# Pull from private registry
docker pull registry.company.com/team/myapp:latest
```

## Step 6: Use Private Images in Portainer Stacks

In your Compose file, reference the private registry image:

```yaml
services:
  app:
    image: registry.company.com/team/myapp:latest
    # Portainer can use stored registry credentials during deployment

  db-proxy:
    image: registry.company.com/infra/pgbouncer:1.21
```

Portainer can use configured registry credentials during stack deployment. If you have multiple registries from the same provider or hostname, explicitly select the correct registry in Portainer so Docker uses the right credentials.

## Step 7: Test Registry Connectivity

```bash
# Test authentication from the Docker host
docker login registry.company.com

# Test image pull
docker pull registry.company.com/team/myapp:latest

# List registry contents (if registry supports it)
curl -u registryuser:strongpassword \
  https://registry.company.com/v2/_catalog
```

## Step 8: Configure Registry Mirrors

For caching Docker Hub images through a pull-through cache registry, configure Docker to use it as a mirror:

```json
// /etc/docker/daemon.json
{
  "registry-mirrors": ["https://registry.company.com"]
}
```

Or configure a pull-through cache in your Harbor or Nexus instance.

## Troubleshooting

### Connection Refused

```bash
# Check registry is accessible
curl -I https://registry.company.com/v2/
# Expected: HTTP 401 Unauthorized (registry is up, auth required)
```

### TLS Certificate Errors

```bash
# Check cert validity
openssl s_client -connect registry.company.com:443 -servername registry.company.com

# If self-signed, add to trusted CAs (see Step 4)
```

### Authentication Failed

```bash
# Test credentials directly
curl -u username:password https://registry.company.com/v2/_catalog
# Should return JSON list of repositories
```

## Conclusion

Adding a custom private registry to Portainer enables seamless pulling of internal or proprietary container images for all deployments. Configure TLS for security, store credentials in Portainer rather than in Compose files, and use your private registry as a single source of truth for all container images in your organization.
