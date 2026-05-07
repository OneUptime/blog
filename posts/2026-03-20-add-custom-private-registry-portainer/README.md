# How to Add a Custom Private Registry to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Private Registry, Docker Registry, Container Management, DevOps

Description: Learn how to connect a self-hosted Docker registry to Portainer so you can pull and push private images.

## Overview

Many teams run their own private Docker registry using the official `registry:3` image. Portainer supports connecting to any custom registry that speaks the Docker Registry HTTP API v2.

## Setting Up a Local Registry

Before adding it to Portainer, ensure your registry is running:

```bash
# Run a basic private registry on port 5000

docker run -d \
  -p 5000:5000 \
  --restart=always \
  --name registry \
  -v "$(pwd)"/registry-data:/var/lib/registry \
  registry:3
```

## Adding a Custom Registry to Portainer

1. Log in to Portainer as an administrator.
2. Navigate to **Registries**.
3. Click **Add registry**.
4. Select **Custom registry**.
5. Fill in the fields:
   - **Name**: A friendly name (e.g., "My Private Registry")
   - **Registry URL**: The URL to your registry (e.g., `https://registry.mycompany.com:5000`; if your registry uses HTTP, include `http://` explicitly)
   - **Authentication**: Enable and enter username/password if your registry requires auth
6. Click **Add registry**.

## Running a Registry with Authentication

For production, use a registry with TLS and basic authentication:

```bash
# Generate an htpasswd file for basic auth
mkdir -p auth

docker run --rm \
  --entrypoint htpasswd \
  httpd:2 -Bbn myuser mypassword > auth/htpasswd

# Run the registry with authentication
# Assumes your TLS certificate and key are present at certs/domain.crt and certs/domain.key
docker run -d \
  -p 5000:5000 \
  --restart=always \
  --name registry \
  -v "$(pwd)"/registry-data:/var/lib/registry \
  -v "$(pwd)"/auth:/auth \
  -v "$(pwd)"/certs:/certs \
  -e REGISTRY_AUTH=htpasswd \
  -e REGISTRY_AUTH_HTPASSWD_REALM="Registry Realm" \
  -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/domain.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/domain.key \
  registry:3
```

## Pushing Images to Your Private Registry

```bash
# If authentication is enabled, log in first
docker login registry.mycompany.com:5000

# Tag a local image for your private registry
docker tag nginx:alpine registry.mycompany.com:5000/nginx:alpine

# Push the tagged image
docker push registry.mycompany.com:5000/nginx:alpine
```

## Using the Registry in Portainer

After registering, your custom registry becomes available when deploying containers or stacks in Portainer:

```yaml
services:
  web:
    # Reference images from your custom registry
    image: registry.mycompany.com:5000/nginx:alpine
```

## Insecure Registries (HTTP)

If your registry uses HTTP (not HTTPS), add it to Docker's insecure registries list on each node in `/etc/docker/daemon.json`:

```json
{
  "insecure-registries": ["registry.mycompany.com:5000"]
}
```

When adding the registry in Portainer, use the full HTTP URL (for example, `http://registry.mycompany.com:5000`) and restart Docker on each node after updating the daemon configuration.

## Conclusion

Portainer makes it easy to add self-hosted private registries as centrally managed sources. Always use HTTPS and authentication for production registries to keep your images secure.
