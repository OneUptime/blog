# How to Configure Machine Registries in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Container Registry, Machine Configuration, Kubernetes, Docker

Description: Step-by-step guide to configuring container registries in Talos Linux including mirrors, authentication, and private registry setup.

---

Container images are the building blocks of everything running on your Talos Linux cluster. Every pod, every system service, every component pulls its image from a container registry. By default, Talos knows how to pull from public registries like Docker Hub and the GitHub Container Registry. But in production, you almost certainly need to configure custom registry settings - whether that means pointing to a local mirror, authenticating with a private registry, or routing pulls through a proxy cache.

This guide covers how to configure machine registries in Talos Linux, from basic mirrors to full authentication setups.

## The Registry Configuration Structure

Registry configuration lives under `machine.registries` in the Talos machine config. There are two main subsections: `mirrors` and `config`. Mirrors define where to pull images from, and config handles authentication and TLS settings for those endpoints.

```yaml
# Basic registry configuration structure
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://registry.local:5000
    config:
      registry.local:5000:
        tls:
          insecureSkipVerify: false
        auth:
          username: myuser
          password: mypassword
```

## Setting Up Registry Mirrors

A registry mirror tells Talos to pull images from an alternative location instead of the original registry. This is commonly used for two purposes: reducing external bandwidth by caching images locally, and improving pull speeds by having a registry closer to your nodes.

```yaml
# Mirror Docker Hub to a local registry
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://harbor.internal.company.com/v2/dockerhub-proxy
```

With this configuration, when a pod tries to pull `nginx:latest` (which resolves to `docker.io/library/nginx:latest`), Talos will actually pull from your Harbor instance instead. If the local mirror does not have the image, most registry proxies will fetch it from the upstream and cache it for future pulls.

You can configure mirrors for multiple registries:

```yaml
# Mirror multiple upstream registries
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://harbor.internal.com/v2/dockerhub
      gcr.io:
        endpoints:
          - https://harbor.internal.com/v2/gcr
      ghcr.io:
        endpoints:
          - https://harbor.internal.com/v2/ghcr
      registry.k8s.io:
        endpoints:
          - https://harbor.internal.com/v2/k8s
```

This is especially useful in air-gapped environments where nodes cannot reach the internet at all. Every image pull goes through your internal registry, which you have pre-populated with the necessary images.

## Configuring Authentication

Many private registries require authentication. Talos supports username/password auth and identity token auth. Here is how to set up basic authentication:

```yaml
# Authenticate with a private registry
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://registry.company.com
    config:
      registry.company.com:
        auth:
          username: deploy-bot
          password: s3cur3-t0k3n
```

For registries that use token-based authentication (like some enterprise setups), you can provide an identity token:

```yaml
# Token-based authentication
machine:
  registries:
    config:
      registry.company.com:
        auth:
          identityToken: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Keep in mind that these credentials are stored in the machine configuration, which is encrypted at rest on the Talos node. However, you should still follow the principle of least privilege and use service accounts with read-only access to the registry.

## TLS Configuration

If your private registry uses a self-signed certificate or a certificate from an internal CA, you need to tell Talos to trust it. There are a few ways to handle this.

The simplest (but least secure) approach is to skip TLS verification:

```yaml
# Skip TLS verification - not recommended for production
machine:
  registries:
    config:
      registry.internal:5000:
        tls:
          insecureSkipVerify: true
```

A better approach is to provide the CA certificate that signed your registry's TLS certificate:

```yaml
# Trust a custom CA for registry TLS
machine:
  registries:
    config:
      registry.internal.com:
        tls:
          clientIdentity:
            crt: |
              -----BEGIN CERTIFICATE-----
              MIIBkTCB+wIUZx... (client certificate)
              -----END CERTIFICATE-----
            key: |
              -----BEGIN EC PRIVATE KEY-----
              MHQCAQEEIBk5... (client key)
              -----END EC PRIVATE KEY-----
          ca: |
            -----BEGIN CERTIFICATE-----
            MIIBnDCCAUKg... (CA certificate)
            -----END CERTIFICATE-----
```

The `ca` field contains the PEM-encoded CA certificate. The `clientIdentity` section is optional and only needed if the registry requires mutual TLS (mTLS) authentication.

## Overriding the Default Endpoint

By default, each mirror falls back to the original registry if the mirror endpoint is unreachable. You can control this behavior by listing multiple endpoints in order of preference:

```yaml
# Multiple endpoints with fallback
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://primary-mirror.internal.com  # Try this first
          - https://backup-mirror.internal.com   # Fall back to this
          - https://registry-1.docker.io         # Last resort: upstream
```

Talos tries each endpoint in order. If the first one fails, it moves to the second, and so on. If you want to prevent any fallback to the public internet (for air-gapped deployments), simply omit the upstream URL from the list.

## Wildcard Registry Mirrors

Sometimes you want all image pulls to go through a single mirror regardless of the source registry. Talos supports a wildcard mirror for this:

```yaml
# Route all image pulls through a single registry
machine:
  registries:
    mirrors:
      "*":
        endpoints:
          - https://universal-mirror.internal.com
```

This catches every image pull and sends it to your universal mirror. The mirror needs to be configured to handle requests for images from any upstream registry, which is a feature that tools like Harbor's proxy cache support.

## Applying Registry Configuration

You apply registry configuration the same way you apply any machine config change. For new nodes:

```bash
# Apply config with registry settings to a new node
talosctl apply-config --insecure \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

For existing nodes, you can apply the change without a reboot:

```bash
# Apply updated registry config to a running node
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

Registry configuration changes take effect immediately for new image pulls. Images that are already cached on the node will not be re-pulled unless you explicitly remove them or update the image tag.

## Verifying Registry Configuration

After applying your config, you can verify that the registry settings are correct by checking the CRI (Container Runtime Interface) configuration:

```bash
# Check the current registry config on the node
talosctl get registriesconfig --nodes 192.168.1.100 -o yaml
```

You can also test an image pull to make sure everything works:

```bash
# Pull a test image through the configured registry
talosctl image pull --nodes 192.168.1.100 docker.io/library/busybox:latest
```

If the pull succeeds, your registry configuration is working correctly. If it fails, check the node logs for error messages about TLS handshake failures, authentication errors, or DNS resolution problems.

## Best Practices

Always use registry mirrors in production. They reduce your dependency on external services, speed up image pulls, and give you control over which images are available in your environment. Use proper TLS with a trusted CA rather than skipping verification. Rotate registry credentials on a regular schedule. And if you are running an air-gapped cluster, pre-populate your internal registry with every image your cluster needs before deployment, including Talos system images and Kubernetes component images.
