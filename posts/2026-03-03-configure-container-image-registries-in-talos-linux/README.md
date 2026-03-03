# How to Configure Container Image Registries in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Container Registry, Docker, Kubernetes, Image Management

Description: A complete guide to configuring container image registries in Talos Linux including mirrors, authentication, and TLS settings.

---

Container image registries are where your Kubernetes cluster pulls the images it needs to run workloads. In Talos Linux, registry configuration happens at the machine level, which means every container runtime operation on the node uses these settings. This includes Kubernetes pods, system containers, and even the images Talos itself uses.

Getting registry configuration right is important for pull performance, reliability, and security. This guide covers everything you need to know about configuring registries in Talos Linux.

## Registry Configuration Structure

Registry settings live under `machine.registries` in the Talos machine configuration. There are two main sections: `mirrors` for configuring registry endpoints and `config` for authentication and TLS settings.

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://mirror.example.com
          - https://registry-1.docker.io
    config:
      mirror.example.com:
        auth:
          username: myuser
          password: mypassword
        tls:
          insecureSkipVerify: false
```

## Configuring Registry Mirrors

Registry mirrors redirect image pulls from one registry to another. This is useful for reducing bandwidth, improving pull speed, and working around rate limits:

```yaml
machine:
  registries:
    mirrors:
      # Mirror Docker Hub pulls to a local registry
      docker.io:
        endpoints:
          - https://docker-mirror.internal.example.com
          - https://registry-1.docker.io
      # Mirror GitHub Container Registry
      ghcr.io:
        endpoints:
          - https://ghcr-mirror.internal.example.com
          - https://ghcr.io
      # Mirror Google Container Registry
      gcr.io:
        endpoints:
          - https://gcr-mirror.internal.example.com
          - https://gcr.io
      # Mirror Kubernetes registry
      registry.k8s.io:
        endpoints:
          - https://k8s-mirror.internal.example.com
          - https://registry.k8s.io
```

The endpoints are tried in order. If the first mirror is unavailable, containerd falls back to the next one. Always include the original registry as the last endpoint for resilience.

## Authentication Configuration

For private registries that require authentication, configure credentials in the `config` section:

```yaml
machine:
  registries:
    config:
      my-registry.example.com:
        auth:
          username: deploy-user
          password: deploy-password
      another-registry.example.com:
        auth:
          # Use an identity token instead of username/password
          identityToken: "eyJhbGciOiJSUzI1NiIs..."
```

You can also use authentication with registry mirrors:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://authenticated-mirror.example.com
    config:
      authenticated-mirror.example.com:
        auth:
          username: mirror-user
          password: mirror-password
```

## TLS Configuration

For registries using self-signed certificates or internal CAs, configure TLS settings:

```yaml
machine:
  registries:
    config:
      internal-registry.example.com:
        tls:
          # Provide the CA certificate
          clientIdentity:
            crt: |
              -----BEGIN CERTIFICATE-----
              MIIBxTCCAW...
              -----END CERTIFICATE-----
            key: |
              -----BEGIN EC PRIVATE KEY-----
              MHQCAQEEIGf...
              -----END EC PRIVATE KEY-----
          ca: |
            -----BEGIN CERTIFICATE-----
            MIIBhTCCASug...
            -----END CERTIFICATE-----
```

If you need to skip TLS verification for a development registry (not recommended for production):

```yaml
machine:
  registries:
    config:
      dev-registry.local:
        tls:
          insecureSkipVerify: true
```

## Wildcard Registry Configuration

You can configure settings for all registries that match a pattern. However, Talos requires explicit registry hostnames in the configuration. For a catch-all approach, use the default mirror:

```yaml
machine:
  registries:
    mirrors:
      # Default mirror for any registry not explicitly listed
      "*":
        endpoints:
          - https://universal-mirror.example.com
```

Note that wildcard support depends on your Talos version. Check the documentation for your specific version.

## Configuring Multiple Registries

In a production environment, you typically need to configure several registries:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://docker-cache.internal:5000
      ghcr.io:
        endpoints:
          - https://ghcr-cache.internal:5000
      quay.io:
        endpoints:
          - https://quay-cache.internal:5000
    config:
      docker-cache.internal:5000:
        tls:
          insecureSkipVerify: false
          ca: |
            -----BEGIN CERTIFICATE-----
            ...internal CA cert...
            -----END CERTIFICATE-----
      ghcr-cache.internal:5000:
        tls:
          insecureSkipVerify: false
          ca: |
            -----BEGIN CERTIFICATE-----
            ...internal CA cert...
            -----END CERTIFICATE-----
      quay-cache.internal:5000:
        tls:
          insecureSkipVerify: false
          ca: |
            -----BEGIN CERTIFICATE-----
            ...internal CA cert...
            -----END CERTIFICATE-----
```

## Applying Registry Configuration

Apply registry changes to your nodes:

```bash
# Apply to a single node
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Or patch the configuration
cat > registry-patch.yaml <<EOF
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://docker-cache.internal:5000
          - https://registry-1.docker.io
EOF

talosctl patch machineconfig --nodes 10.0.0.5 --patch @registry-patch.yaml
```

Registry changes take effect immediately. Containerd picks up the new configuration without requiring a restart.

## Verifying Registry Configuration

After applying the configuration, verify that images are being pulled from the correct registry:

```bash
# Pull an image and check it works
kubectl run test-pull --image=nginx:latest --restart=Never

# Check containerd logs for pull activity
talosctl logs containerd --nodes 10.0.0.5 | grep "pull"

# List cached images
talosctl images --nodes 10.0.0.5
```

## Troubleshooting Registry Issues

Common registry problems and how to diagnose them:

```bash
# Check if the registry is reachable from the node
talosctl logs containerd --nodes 10.0.0.5 | grep -i "error\|fail\|timeout"

# Verify DNS resolution
talosctl read /etc/resolv.conf --nodes 10.0.0.5

# Check for TLS errors
talosctl logs containerd --nodes 10.0.0.5 | grep -i "tls\|certificate\|x509"
```

Common issues include DNS resolution failures for internal registries, expired or mismatched TLS certificates, and incorrect authentication credentials.

## Registry Configuration for System Images

Talos itself needs to pull images for system components. Make sure your registry configuration covers the registries that Talos system images come from:

```yaml
machine:
  registries:
    mirrors:
      # Talos system images come from ghcr.io
      ghcr.io:
        endpoints:
          - https://ghcr-mirror.internal:5000
          - https://ghcr.io
      # Kubernetes components come from registry.k8s.io
      registry.k8s.io:
        endpoints:
          - https://k8s-mirror.internal:5000
          - https://registry.k8s.io
```

If the system images cannot be pulled, nodes may fail to join the cluster or fail during upgrades.

## Conclusion

Registry configuration in Talos Linux is centralized, declarative, and applies to all container operations on the node. Use mirrors for performance and reliability, configure authentication for private registries, and set up proper TLS for secure communication. The configuration applies immediately without service restarts, making it easy to iterate. Always include fallback endpoints and test your configuration before rolling it out to all nodes.
