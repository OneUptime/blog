# How to Configure containerd Registry Mirrors and Credentials for Private Kubernetes Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Registry, containerd

Description: Learn how to configure containerd registry mirrors and authentication credentials for private registries to improve image pull performance and reliability in Kubernetes clusters.

---

Registry mirrors and credential configuration are essential for production Kubernetes clusters. Mirrors reduce external bandwidth usage and improve pull performance, while proper authentication ensures access to private container images. As containerd replaced Docker as the default Kubernetes runtime, understanding its registry configuration becomes critical for cluster operators.

This guide covers configuring registry mirrors, setting up authentication for private registries, and troubleshooting common image pull issues in containerd-based Kubernetes clusters.

## Understanding containerd Registry Configuration

Containerd uses a different approach than Docker for registry configuration. Instead of a single daemon configuration file, containerd supports per-registry configuration in separate files. This modular design allows fine-grained control over mirror endpoints, TLS settings, and authentication per registry.

The registry configuration lives in `/etc/containerd/config.toml` or in separate configuration files under `/etc/containerd/certs.d/`. The newer directory-based approach provides better organization and easier updates.

## Configuring Registry Mirrors in containerd

Registry mirrors intercept image pulls and redirect them to local or regional cache servers. This reduces latency and bandwidth costs while improving availability.

Edit `/etc/containerd/config.toml` to add mirror configuration.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".registry]
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["https://mirror.example.com", "https://registry-1.docker.io"]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."gcr.io"]
      endpoint = ["https://gcr-mirror.example.com", "https://gcr.io"]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."quay.io"]
      endpoint = ["https://quay-mirror.example.com", "https://quay.io"]
```

The endpoint list defines the order containerd tries when pulling images. If the first mirror fails, it falls back to subsequent endpoints automatically.

Restart containerd to apply changes.

```bash
sudo systemctl restart containerd

# Verify configuration
sudo crictl info | jq '.config.registry'
```

## Setting Up a Local Registry Mirror with Harbor

Deploy Harbor as a local registry mirror to cache external images. This example uses Docker Compose for simplicity, but production deployments should use Kubernetes.

```bash
# Create Harbor directory
mkdir -p /opt/harbor
cd /opt/harbor

# Download Harbor installer
curl -LO https://github.com/goharbor/harbor/releases/download/v2.10.0/harbor-offline-installer-v2.10.0.tgz

# Extract files
tar xzf harbor-offline-installer-v2.10.0.tgz
cd harbor

# Configure Harbor
cp harbor.yml.tmpl harbor.yml
```

Edit `harbor.yml` to configure as a proxy cache.

```yaml
hostname: registry.example.com

http:
  port: 80

harbor_admin_password: Harbor12345

database:
  password: root123
  max_idle_conns: 100
  max_open_conns: 900

data_volume: /data

# Enable proxy cache
proxy:
  remote_url: https://registry-1.docker.io
  username: ""
  password: ""
```

Install and start Harbor.

```bash
sudo ./install.sh --with-chartmuseum --with-trivy

# Verify Harbor is running
docker ps | grep harbor
```

## Configuring Authentication for Private Registries

Private registries require authentication credentials. Containerd supports multiple authentication methods including basic auth, token-based auth, and credential helpers.

Create credential configuration for your private registry. Use the directory-based approach for better organization.

```bash
# Create directory for registry credentials
sudo mkdir -p /etc/containerd/certs.d/myregistry.example.com

# Create hosts.toml configuration
sudo tee /etc/containerd/certs.d/myregistry.example.com/hosts.toml <<EOF
server = "https://myregistry.example.com"

[host."https://myregistry.example.com"]
  capabilities = ["pull", "resolve", "push"]
  ca = "/etc/containerd/certs.d/myregistry.example.com/ca.crt"

[host."https://myregistry.example.com".header]
  authorization = "Basic $(echo -n 'username:password' | base64)"
EOF
```

For more secure credential management, use a credential helper instead of embedding passwords in configuration files.

```bash
# Install credential helper
sudo curl -L https://github.com/GoogleCloudPlatform/docker-credential-gcr/releases/download/v2.1.0/docker-credential-gcr_linux_amd64-2.1.0.tar.gz \
  -o /tmp/gcr-credential-helper.tar.gz

sudo tar -C /usr/local/bin -xzf /tmp/gcr-credential-helper.tar.gz
sudo chmod +x /usr/local/bin/docker-credential-gcr

# Configure containerd to use credential helper
sudo tee /etc/containerd/certs.d/gcr.io/hosts.toml <<EOF
server = "https://gcr.io"

[host."https://gcr.io"]
  capabilities = ["pull", "resolve"]

[host."https://gcr.io".auth]
  credHelper = "gcr"
EOF
```

## Configuring TLS Certificates for Self-Signed Registries

When using self-signed certificates for internal registries, configure containerd to trust your CA certificate.

```bash
# Copy your CA certificate
sudo mkdir -p /etc/containerd/certs.d/registry.internal.com
sudo cp ca.crt /etc/containerd/certs.d/registry.internal.com/

# Create hosts.toml with CA configuration
sudo tee /etc/containerd/certs.d/registry.internal.com/hosts.toml <<EOF
server = "https://registry.internal.com"

[host."https://registry.internal.com"]
  capabilities = ["pull", "resolve", "push"]
  ca = ["/etc/containerd/certs.d/registry.internal.com/ca.crt"]
  skip_verify = false
EOF
```

For development environments only, you can skip TLS verification, but never do this in production.

```toml
[host."https://registry.internal.com"]
  capabilities = ["pull", "resolve", "push"]
  skip_verify = true
```

Restart containerd after certificate configuration.

```bash
sudo systemctl restart containerd
```

## Creating ImagePullSecrets for Kubernetes

Kubernetes needs credentials to pull images from private registries. Create ImagePullSecrets for each namespace that uses private images.

```bash
# Create secret with registry credentials
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=user@example.com \
  -n default

# Verify secret creation
kubectl get secret regcred -n default -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

Reference the secret in pod specifications.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-image-test
spec:
  containers:
  - name: app
    image: myregistry.example.com/private/app:v1.0
  imagePullSecrets:
  - name: regcred
```

For convenience, add the ImagePullSecret to the default service account so all pods in the namespace can use it automatically.

```bash
kubectl patch serviceaccount default -n default \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

## Setting Up Multiple Mirror Endpoints with Fallback

Configure multiple mirror endpoints to improve reliability. Containerd automatically fails over to the next endpoint if one becomes unavailable.

```bash
sudo tee /etc/containerd/certs.d/docker.io/hosts.toml <<EOF
server = "https://registry-1.docker.io"

# Primary mirror (local)
[host."https://local-mirror.example.com"]
  capabilities = ["pull", "resolve"]

# Secondary mirror (regional)
[host."https://us-mirror.example.com"]
  capabilities = ["pull", "resolve"]

# Tertiary mirror (CDN)
[host."https://cdn-mirror.example.com"]
  capabilities = ["pull", "resolve"]

# Fallback to official registry
[host."https://registry-1.docker.io"]
  capabilities = ["pull", "resolve"]
EOF
```

Test the fallback mechanism by temporarily blocking access to the primary mirror.

```bash
# Add firewall rule to block primary mirror
sudo iptables -A OUTPUT -d local-mirror.example.com -j DROP

# Pull an image to test fallback
sudo crictl pull nginx:latest

# Check containerd logs to see which mirror was used
sudo journalctl -u containerd -n 50 | grep -i mirror
```

## Configuring Rate Limiting and Retry Behavior

Configure retry behavior for transient failures and rate limiting scenarios.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"

[plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
  endpoint = ["https://mirror.example.com"]

[plugins."io.containerd.grpc.v1.cri".registry.configs."mirror.example.com".tls]
  insecure_skip_verify = false

[plugins."io.containerd.grpc.v1.cri".registry.configs."mirror.example.com".auth]
  username = "mirror-user"
  password = "mirror-pass"

# Rate limiting configuration
[plugins."io.containerd.grpc.v1.cri".registry.configs."docker.io"]
  max_concurrent_downloads = 6
  max_concurrent_uploads = 3
```

## Troubleshooting Registry Configuration Issues

When pods fail to pull images, check containerd logs for detailed error messages.

```bash
# View containerd logs
sudo journalctl -u containerd -f

# Test image pull directly with crictl
sudo crictl pull myregistry.example.com/app:latest

# Check registry connectivity
curl -v https://myregistry.example.com/v2/

# Verify authentication
curl -u username:password https://myregistry.example.com/v2/_catalog
```

Common issues include expired credentials, network connectivity problems, and certificate validation errors. Check each layer systematically.

```bash
# Verify containerd can resolve registry hostname
nslookup myregistry.example.com

# Test TLS handshake
openssl s_client -connect myregistry.example.com:443

# Check certificate chain
openssl s_client -showcerts -connect myregistry.example.com:443 < /dev/null
```

Properly configured registry mirrors and authentication streamline image distribution in Kubernetes clusters. By caching images locally and configuring fallback endpoints, you improve reliability and reduce external bandwidth usage. Combined with secure credential management, this creates a robust foundation for container image distribution in production environments.
