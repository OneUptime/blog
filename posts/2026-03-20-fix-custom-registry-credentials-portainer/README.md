# How to Fix 'Custom Registry Credentials Ignored' in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Container Registry, Troubleshooting, Docker, DevOps

Description: Learn how to diagnose and fix issues where Portainer ignores stored custom registry credentials when pulling images.

## The Problem

You've added a custom private registry to Portainer with credentials, but when deploying containers or stacks, Portainer still fails with `unauthorized` errors - as if the credentials aren't being used.

## Common Causes

1. If you're deploying as a non-admin user, the registry access for the current environment is not configured.
2. The registry address in Portainer doesn't line up with the host and port used in the image reference.
3. Multiple registries from the same provider or host are configured, and the wrong credentials are being used during deployment.
4. Credentials are correct but the registry uses HTTP or an untrusted certificate.
5. The stored credentials are wrong or expired.

## Fix 1: Ensure Registry Access Is Configured for the Environment

Registry access is assigned per environment. If you're deploying as a non-admin user, make sure the registry is accessible in the current environment:

1. Open the target environment in Portainer.
2. Go to **Host** or **Swarm** and select **Registries**.
3. Find your custom registry and click **Manage access**.
4. Make sure the correct user or team has access, then click **Create access** if needed.

## Fix 2: Match the Image URL to the Registry URL

The registry entry in Portainer needs to line up with the registry host and port used in your image reference. Image names should use only the registry hostname and optional port, not an `https://` prefix:

```yaml
# If your registry is registered as: registry.mycompany.com

# Your image MUST use the same registry host and port:
image: registry.mycompany.com/myteam/myapp:latest

# NOT:
image: registry.mycompany.com:443/myteam/myapp:latest  # Port mismatch
image: https://registry.mycompany.com/myteam/myapp:latest  # Protocol prefix
```

## Fix 3: Select the Registry Explicitly During Stack Deployment

By default, Portainer uses all configured registries during stack deployment. If you have multiple registries from the same provider or host, explicitly selecting the intended registry can prevent Docker from using the wrong credentials.

If your registry listens on a non-default port, keep that same port in the image reference, for example `registry.mycompany.com:5000/myapp:latest`.

## Fix 4: Re-Test Credentials

```bash
# Manually test the credentials Portainer is using
printf '%s\n' "$REGISTRY_PASSWORD" | docker login registry.mycompany.com \
  --username "$REGISTRY_USERNAME" \
  --password-stdin

# If this fails, the credentials themselves are wrong
```

## Fix 5: Handle Insecure Registries

If your registry uses plain HTTP or a certificate Docker doesn't trust, configure the Docker daemon on every Swarm/Docker node:

```json
{
  "insecure-registries": ["registry.mycompany.com:5000"]
}
```

```bash
sudo systemctl restart docker
```

## Fix 6: Verify via Portainer API

```bash
# List registries to check their configuration
curl -k -H "X-API-Key: $PORTAINER_API_KEY" \
  https://localhost:9443/api/registries | jq '.[] | {id: .Id, name: .Name, url: .URL, authentication: .Authentication}'
```

## Conclusion

The most common causes of ignored credentials in Portainer are registry access not being configured for the current environment, a host or port mismatch in the image reference, or the wrong registry being selected during deployment. Always verify registry access, the image's `host[:port]`, and the credentials themselves.
