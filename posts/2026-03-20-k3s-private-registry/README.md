# How to Configure K3s Private Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Private Registry, Container Image, Security

Description: Learn how to configure K3s to pull container images from private registries, including authentication and TLS configuration.

## Introduction

In production environments, you often need to pull container images from private registries - either for security (keeping proprietary images off public repositories) or for performance (local registries reduce pull times). K3s configures private registries through a `registries.yaml` file that supports mirrors, authentication, and TLS configuration.

## Registry Configuration File

K3s reads the registry configuration from `/etc/rancher/k3s/registries.yaml`. This file must exist on every node (both server and agent) that needs to pull from private registries.

## Basic Private Registry Configuration

```bash
sudo tee /etc/rancher/k3s/registries.yaml > /dev/null <<EOF
# registries.yaml - K3s private registry configuration

mirrors:
  # Try your private mirror first for docker.io pulls
  "docker.io":
    endpoint:
      - "https://registry.example.com"

configs:
  # Authentication for the private registry
  "registry.example.com":
    auth:
      username: "admin"
      password: "RegistryPassword"
    tls:
      # CA certificate for the registry's TLS certificate
      ca_file: "/etc/rancher/k3s/registry-ca.crt"
EOF
```

After creating or updating the file, restart K3s:

```bash
sudo systemctl restart k3s        # On server nodes
sudo systemctl restart k3s-agent  # On agent nodes
```

## Mirror Configuration

Mirrors tell containerd which endpoints to try first for a given registry. Unless the node is started with `--disable-default-registry-endpoint`, containerd still tries the registry's default endpoint as a last resort. This is useful for:
- Replacing Docker Hub with a local cache
- Pointing to an air-gapped registry when combined with `--disable-default-registry-endpoint`
- Using a pull-through cache

### Mirroring Multiple Registries

```yaml
# /etc/rancher/k3s/registries.yaml

mirrors:
  # Docker Hub mirror
  "docker.io":
    endpoint:
      - "https://docker-cache.example.com"

  # k8s.io image mirror
  "registry.k8s.io":
    endpoint:
      - "https://k8s-cache.example.com"

  # GitHub Container Registry mirror
  "ghcr.io":
    endpoint:
      - "https://ghcr-cache.example.com"

  # Quay.io mirror
  "quay.io":
    endpoint:
      - "https://quay-cache.example.com"
```

## Authentication Configuration

### Username/Password Authentication

```yaml
configs:
  "registry.example.com":
    auth:
      username: "myuser"
      password: "mypassword"
```

### Using a Token (Docker Hub PAT)

```yaml
configs:
  "registry-1.docker.io":
    auth:
      username: "myusername"
      password: "dckr_pat_xxxxxxxxxxxx"  # Docker Hub Personal Access Token
```

### Using Base64-Encoded Basic Auth

```yaml
configs:
  "registry.example.com":
    auth:
      # Base64 encoded "username:password"
      auth: "dXNlcjpwYXNzd29yZA=="
```

## TLS Configuration

### Using a Self-Signed or Private CA

```bash
# Copy the registry CA certificate to each K3s node
sudo mkdir -p /etc/rancher/k3s/

# From the registry server, copy the CA cert
scp registry-server:/etc/ssl/certs/registry-ca.crt \
    /etc/rancher/k3s/registry-ca.crt
```

```yaml
configs:
  "registry.example.com:5000":
    tls:
      ca_file: "/etc/rancher/k3s/registry-ca.crt"
```

### Using Client Certificates (mTLS)

```yaml
configs:
  "registry.example.com":
    tls:
      ca_file: "/etc/rancher/k3s/registry-ca.crt"
      cert_file: "/etc/rancher/k3s/registry-client.crt"
      key_file: "/etc/rancher/k3s/registry-client.key"
```

### Skipping TLS Verification (Development Only)

```yaml
configs:
  "registry.example.com:5000":
    tls:
      insecure_skip_verify: true
```

## Complete Production Configuration

```yaml
# /etc/rancher/k3s/registries.yaml - Production configuration

mirrors:
  # Try the internal mirror first for docker.io pulls
  "docker.io":
    endpoint:
      - "https://docker-mirror.internal.example.com"

  # Internal registry for company images
  "registry.internal.example.com":
    endpoint:
      - "https://registry.internal.example.com"

configs:
  # Internal mirror authentication
  "docker-mirror.internal.example.com":
    auth:
      username: "k3s-puller"
      password: "SecurePullPassword"
    tls:
      ca_file: "/etc/rancher/k3s/internal-ca.crt"

  # Private company registry
  "registry.internal.example.com":
    auth:
      username: "k3s-puller"
      password: "SecurePullPassword"
    tls:
      ca_file: "/etc/rancher/k3s/internal-ca.crt"
      cert_file: "/etc/rancher/k3s/k3s-client.crt"
      key_file: "/etc/rancher/k3s/k3s-client.key"
```

## Setting Up a Simple Pull-Through Cache

Deploy a registry with a pull-through cache on your internal network:

```yaml
# docker-compose.yml for a pull-through cache
services:
  docker-cache:
    image: registry:3
    ports:
      - "5000:5000"
    environment:
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
      REGISTRY_PROXY_USERNAME: your-docker-hub-username
      REGISTRY_PROXY_PASSWORD: your-docker-hub-pat
    volumes:
      - /opt/docker-cache:/var/lib/registry
    restart: always
```

Then configure K3s to use it:

```yaml
# registries.yaml
mirrors:
  "docker.io":
    endpoint:
      - "http://docker-cache.internal:5000"
```

## Deploying with Private Registry Images

```yaml
# deployment with private image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: private-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: private-app
  template:
    metadata:
      labels:
        app: private-app
    spec:
      containers:
        - name: app
          # This image will be pulled from the private registry
          # No imagePullSecrets needed since registries.yaml handles auth
          image: registry.internal.example.com/myapp:1.0
          ports:
            - containerPort: 8080
```

## Troubleshooting

### Pull Fails with "no basic auth credentials"

```bash
# Verify the registries.yaml is present and correct
sudo cat /etc/rancher/k3s/registries.yaml

# Check containerd's registry log on the node that pulled the image
sudo tail -n 100 /var/lib/rancher/k3s/agent/containerd/containerd.log

# Restart K3s to reload registry config
sudo systemctl restart k3s        # On server nodes
sudo systemctl restart k3s-agent  # On agent nodes
```

### TLS Certificate Error

```bash
# Test the registry certificate directly
curl -v --cacert /etc/rancher/k3s/registry-ca.crt \
    https://registry.example.com/v2/

# Check certificate details
openssl s_client -connect registry.example.com:443 2>/dev/null | \
    openssl x509 -noout -text | grep -E "Subject:|Issuer:|Not After"
```

### Image Pull Succeeded but Wrong Image

```bash
# Verify which image was actually pulled
sudo k3s crictl images | grep myapp

# Check image digest
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].imageID}'
```

## Conclusion

K3s's `registries.yaml` configuration provides a flexible way to configure private registries, mirrors, and authentication across all cluster nodes. By configuring mirrors, you can try internal caches before the default upstream fallback to improve performance and reduce external bandwidth. TLS and authentication options ensure that registry access is secure. Remember to deploy the `registries.yaml` to every node and restart the K3s service after changes.
