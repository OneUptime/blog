# How to Configure containerd Registry Mirrors and Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Registry, Containerd

Description: Learn how to configure containerd registry mirrors and authentication credentials for private registries to improve image pull performance and reliability in Kubernetes clusters.

---

Registry mirrors and credential configuration are essential for production Kubernetes clusters. Mirrors reduce external bandwidth usage and improve pull performance, while proper authentication ensures access to private container images. As many Kubernetes distributions moved from Docker Engine to containerd after dockershim removal, understanding its registry configuration becomes critical for cluster operators.

This guide covers configuring registry mirrors, setting up authentication for private registries, and troubleshooting common image pull issues in containerd-based Kubernetes clusters.

## Understanding containerd Registry Configuration

Containerd uses a different approach than Docker for registry configuration. Instead of a single daemon configuration file, containerd supports per-registry configuration in separate files. This modular design allows fine-grained control over mirror endpoints, TLS settings, and authentication per registry.

The registry configuration is enabled from `/etc/containerd/config.toml` and can be split into separate host configuration files under `/etc/containerd/certs.d/`. The newer directory-based approach provides better organization and easier updates.

## Configuring Registry Mirrors in containerd

Registry mirrors intercept image pulls and redirect them to local or regional cache servers. This reduces latency and bandwidth costs while improving availability.

Edit `/etc/containerd/config.toml` to point containerd at the registry hosts directory.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"
```

Create per-registry `hosts.toml` files for each mirror.

```bash
sudo mkdir -p /etc/containerd/certs.d/docker.io
sudo tee /etc/containerd/certs.d/docker.io/hosts.toml <<EOF
server = "https://registry-1.docker.io"

[host."https://mirror.example.com"]
  capabilities = ["pull"]

[host."https://registry-1.docker.io"]
  capabilities = ["pull", "resolve"]
EOF

sudo mkdir -p /etc/containerd/certs.d/gcr.io
sudo tee /etc/containerd/certs.d/gcr.io/hosts.toml <<EOF
server = "https://gcr.io"

[host."https://gcr-mirror.example.com"]
  capabilities = ["pull"]

[host."https://gcr.io"]
  capabilities = ["pull", "resolve"]
EOF

sudo mkdir -p /etc/containerd/certs.d/quay.io
sudo tee /etc/containerd/certs.d/quay.io/hosts.toml <<EOF
server = "https://quay.io"

[host."https://quay-mirror.example.com"]
  capabilities = ["pull"]

[host."https://quay.io"]
  capabilities = ["pull", "resolve"]
EOF
```

The host entries define the order containerd tries when pulling images. If the first mirror fails, it falls back to subsequent hosts automatically.

Restart containerd after changing `config.toml`. Future updates under `/etc/containerd/certs.d/` do not require restarting the daemon.

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

Edit `harbor.yml` to configure the Harbor instance.

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
```

Install and start Harbor.

```bash
sudo ./install.sh --with-trivy

# Verify Harbor is running
docker ps | grep harbor
```

After Harbor is running, configure proxy cache by creating a registry endpoint for Docker Hub and then creating a proxy cache project that uses that endpoint. Pull images through the proxy cache project path, such as `registry.example.com/dockerhub/library/nginx:latest`, instead of pulling directly from `docker.io`.

## Configuring Authentication for Private Registries

Private registries require authentication credentials. Containerd can use credentials passed by Kubernetes through CRI, deprecated static credentials in `config.toml`, or headers in host configuration files.

Create credential configuration for your private registry. Use the directory-based approach for better organization.

```bash
# Create directory for registry credentials
sudo mkdir -p /etc/containerd/certs.d/myregistry.example.com

# Create hosts.toml configuration
sudo tee /etc/containerd/certs.d/myregistry.example.com/hosts.toml <<EOF
server = "https://myregistry.example.com"

[host."https://myregistry.example.com"]
  capabilities = ["pull", "resolve", "push"]

[host."https://myregistry.example.com".header]
  authorization = "Basic $(printf 'username:password' | base64 -w 0)"
EOF
```

For Kubernetes workloads, prefer an ImagePullSecret instead of embedding long-lived credentials in node configuration files. If you must configure static node-level credentials for older setups that are not using `config_path`, use the supported but deprecated `registry.configs.*.auth` fields in `/etc/containerd/config.toml`.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".registry.configs."gcr.io".auth]
  username = "_json_key"
  password = '{"type":"service_account","project_id":"example","private_key_id":"..."}'
```

Restart containerd after changing static credentials in `config.toml`.

```bash
sudo systemctl restart containerd
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
  capabilities = ["pull"]

# Secondary mirror (regional)
[host."https://us-mirror.example.com"]
  capabilities = ["pull"]

# Tertiary mirror (CDN)
[host."https://cdn-mirror.example.com"]
  capabilities = ["pull"]

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

Configure pull concurrency for image downloads. Retries and rate-limit handling are driven by the registry client and the configured mirror fallback order, not by per-registry `max_concurrent_uploads` settings.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"

[plugins."io.containerd.grpc.v1.cri"]
  max_concurrent_downloads = 6
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
