# How to Configure RKE2 Private Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Private Registry, Harbor, Container Image, Rancher

Description: Learn how to configure RKE2 to pull container images from a private registry, including authentication, TLS, and registry mirror configuration.

Using a private container registry is a common requirement for enterprise Kubernetes deployments. It allows you to host approved container images, enforce image scanning policies, and reduce dependence on external registries. RKE2 uses a `registries.yaml` file to configure registry access. This guide covers complete private registry configuration.

## Prerequisites

- A private container registry (Harbor, Nexus, JFrog Artifactory, or AWS ECR)
- TLS certificate for the registry
- Registry credentials
- RKE2 installed (or being installed)

## Understanding RKE2 Registry Configuration

RKE2 uses `/etc/rancher/rke2/registries.yaml` on each node that pulls images to configure how containerd interacts with container registries. This file supports:

- **Authentication**: Username/password or token auth
- **TLS verification**: CA certificates and skip-verify options
- **Mirrors**: Redirect registry pulls to alternative endpoints

## Step 1: Configure Basic Private Registry

```yaml
# /etc/rancher/rke2/registries.yaml - Basic private registry configuration

configs:
  # Configure authentication for your private registry
  "registry.example.com":
    auth:
      username: "registry-user"
      password: "registry-password"
    tls:
      # CA certificate to verify the registry's TLS certificate
      ca_file: "/etc/ssl/certs/registry-ca.crt"
```

```bash
# Copy the registry CA certificate to all nodes
sudo cp registry-ca.crt /etc/ssl/certs/

# Create the registries configuration on each RKE2 node that will pull from the registry
sudo mkdir -p /etc/rancher/rke2/
sudo tee /etc/rancher/rke2/registries.yaml > /dev/null << 'EOF'
configs:
  "registry.example.com":
    auth:
      username: "k8s-puller"
      password: "your-secure-password"
    tls:
      ca_file: "/etc/ssl/certs/registry-ca.crt"
EOF
sudo chmod 600 /etc/rancher/rke2/registries.yaml

# Restart RKE2 to apply configuration
sudo systemctl restart rke2-server
# or for agent nodes:
# sudo systemctl restart rke2-agent
```

## Step 2: Configure Multiple Registries

```yaml
# /etc/rancher/rke2/registries.yaml - Multiple registry configuration
configs:
  # Primary private registry
  "registry.example.com:5000":
    auth:
      username: "admin"
      password: "admin-password"
    tls:
      ca_file: "/etc/ssl/certs/registry-ca.crt"

  # Harbor registry
  "harbor.internal.example.com":
    auth:
      username: "robot$rke2-puller"
      # Harbor robot account token
      password: "harbor-robot-token"
    tls:
      ca_file: "/etc/ssl/certs/harbor-ca.crt"
      # Optional: specify cert and key for mutual TLS
      # cert_file: "/etc/ssl/certs/client.crt"
      # key_file: "/etc/ssl/private/client.key"

  # AWS ECR (uses token auth refreshed periodically)
  "123456789012.dkr.ecr.us-east-1.amazonaws.com":
    auth:
      # ECR tokens expire after 12 hours
      # Use a cron job to refresh the token
      username: "AWS"
      password: "eyJwYXlsb2FkIjoiQ..."  # ECR auth token
```

## Step 3: Configure Harbor as the Default Registry

```yaml
# /etc/rancher/rke2/config.yaml - Use private registry as system default
# This makes RKE2 prepend the registry to all system images
system-default-registry: harbor.internal.example.com
```

```yaml
# /etc/rancher/rke2/registries.yaml
configs:
  "harbor.internal.example.com":
    auth:
      username: "robot$rke2-system"
      password: "your-robot-token"
    tls:
      ca_file: "/etc/ssl/certs/harbor-ca.crt"
```

## Step 4: Handle Self-Signed Certificates

```bash
# Extract the CA certificate from a self-signed registry
openssl s_client -showcerts \
  -connect registry.example.com:443 \
  </dev/null 2>/dev/null | \
  openssl x509 -outform PEM | \
  sudo tee /etc/ssl/certs/registry-self-signed-ca.crt > /dev/null

# Verify the certificate
openssl x509 -in /etc/ssl/certs/registry-self-signed-ca.crt \
  -noout -text | head -20

# Trust the certificate system-wide on Debian/Ubuntu
sudo cp /etc/ssl/certs/registry-self-signed-ca.crt \
  /usr/local/share/ca-certificates/registry.crt

sudo update-ca-certificates

# Or on RHEL/CentOS
sudo cp /etc/ssl/certs/registry-self-signed-ca.crt \
  /etc/pki/ca-trust/source/anchors/registry.crt

sudo update-ca-trust extract
```

```yaml
# /etc/rancher/rke2/registries.yaml - Self-signed cert
configs:
  "registry.example.com":
    auth:
      username: "user"
      password: "password"
    tls:
      # Option 1: Specify the CA file
      ca_file: "/etc/ssl/certs/registry-self-signed-ca.crt"
      # Option 2: Skip TLS verification (NOT for production)
      # insecure_skip_verify: true
```

## Step 5: Configure AWS ECR with Token Refresh

```bash
# Create a script to refresh ECR credentials
sudo tee /usr/local/bin/refresh-ecr-credentials.sh > /dev/null << 'EOF'
#!/bin/bash
AWS_ACCOUNT_ID="123456789012"
AWS_REGION="us-east-1"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Get ECR login token
ECR_TOKEN=$(aws ecr get-login-password --region "$AWS_REGION")

# Update registries.yaml with the new token
cat > /etc/rancher/rke2/registries.yaml << YAML
configs:
  "${ECR_REGISTRY}":
    auth:
      username: "AWS"
      password: "${ECR_TOKEN}"
    tls:
      insecure_skip_verify: false
YAML
chmod 600 /etc/rancher/rke2/registries.yaml

# Restart RKE2 on the node to regenerate containerd configuration
# Note: This causes brief disruption to running containers
systemctl restart rke2-server 2>/dev/null || \
systemctl restart rke2-agent 2>/dev/null

echo "ECR credentials refreshed at $(date)"
EOF

sudo chmod +x /usr/local/bin/refresh-ecr-credentials.sh

# Create cron job to refresh every 11 hours (ECR tokens expire in 12h)
echo "0 */11 * * * root /usr/local/bin/refresh-ecr-credentials.sh >> /var/log/ecr-refresh.log 2>&1" | \
  sudo tee /etc/cron.d/ecr-refresh
```

## Step 6: Verify Registry Configuration

```bash
# Test pulling from the private registry
kubectl run test-pull \
  --image=registry.example.com/test/nginx:latest \
  --rm -it \
  --restart=Never \
  -- echo "Image pulled successfully"

# Check containerd registry configuration
sudo /var/lib/rancher/rke2/bin/crictl info | \
  python3 -c "import json,sys; d=json.load(sys.stdin); \
  print(json.dumps(d.get('config', {}).get('registry', {}), indent=2))"

# List available images on a node
sudo /var/lib/rancher/rke2/bin/crictl images | head -20

# Check image pull events
kubectl get events -A | grep -E "Pulling|Failed|Error" | head -10
```

## Conclusion

Configuring a private registry for RKE2 provides control over which container images run in your cluster, supports air-gapped deployments, and can significantly improve image pull performance through caching. The `registries.yaml` file provides a flexible configuration interface that supports multiple registries, various authentication methods, and TLS verification options. For production deployments, always use TLS with a proper CA certificate rather than skipping TLS verification, restrict access to node-level registry credentials, and use Kubernetes image pull secrets or external secret managers for workload credentials where appropriate.
