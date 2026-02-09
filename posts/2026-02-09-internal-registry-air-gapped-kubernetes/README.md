# How to Set Up an Internal Container Registry for Air-Gapped Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Registry, Air-Gapped

Description: Learn how to deploy and configure an internal container registry for air-gapped Kubernetes environments, including registry setup, image synchronization, and cluster configuration for offline operation.

---

Air-gapped Kubernetes clusters operate in environments without internet connectivity for security or compliance reasons. These clusters cannot pull images from public registries like Docker Hub or gcr.io. Setting up an internal container registry solves this problem by providing a local source for all container images the cluster needs.

## Understanding Air-Gapped Registry Requirements

An air-gapped registry must store all images your cluster will use, including application images, Kubernetes system components, and third-party tools. You need processes to sync images from external sources to the registry, distribute the registry data to the air-gapped environment, and configure Kubernetes to use the internal registry exclusively.

The registry should provide HTTPS with trusted certificates, support authentication and authorization, include storage backend configuration for reliability, and offer image vulnerability scanning for security.

## Installing Harbor as an Internal Registry

Harbor is an enterprise-grade container registry that includes security scanning, replication, and access control. Deploy Harbor in your air-gapped environment:

```bash
# Download Harbor offline installer (do this on a connected machine)
wget https://github.com/goharbor/harbor/releases/download/v2.10.0/harbor-offline-installer-v2.10.0.tgz

# Transfer the file to your air-gapped environment
# Then extract it
tar xzvf harbor-offline-installer-v2.10.0.tgz
cd harbor
```

Configure Harbor:

```bash
# Copy the configuration template
cp harbor.yml.tmpl harbor.yml

# Edit the configuration
nano harbor.yml
```

Update these settings:

```yaml
# Harbor configuration
hostname: registry.internal.example.com

# HTTPS configuration
https:
  port: 443
  certificate: /data/cert/registry.crt
  private_key: /data/cert/registry.key

# Admin password
harbor_admin_password: ChangeThisPassword

# Database configuration
database:
  password: ChangeThisToo
  max_idle_conns: 100
  max_open_conns: 900

# Data volume
data_volume: /data/harbor

# Storage backend (use local filesystem or S3-compatible storage)
storage_service:
  filesystem:
    rootdirectory: /storage

# Log configuration
log:
  level: info
  local:
    rotate_count: 50
    rotate_size: 200M
    location: /var/log/harbor
```

Generate TLS certificates:

```bash
# Create certificate directory
sudo mkdir -p /data/cert

# Generate private key
openssl genrsa -out /data/cert/registry.key 4096

# Generate certificate signing request
openssl req -new -key /data/cert/registry.key \
  -out /data/cert/registry.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=registry.internal.example.com"

# Generate self-signed certificate (or use your CA)
openssl x509 -req -days 3650 \
  -in /data/cert/registry.csr \
  -signkey /data/cert/registry.key \
  -out /data/cert/registry.crt
```

Install Harbor:

```bash
# Run the installer
sudo ./install.sh --with-trivy --with-chartmuseum

# Verify Harbor is running
docker-compose ps

# Access Harbor web UI at https://registry.internal.example.com
# Default credentials: admin / ChangeThisPassword
```

## Configuring Docker Registry Alternative

For a lighter-weight option, use the official Docker registry:

```bash
# Create directories
sudo mkdir -p /opt/registry/{data,certs,auth}

# Generate htpasswd authentication
docker run --rm --entrypoint htpasswd httpd:2 -Bbn admin password123 \
  | sudo tee /opt/registry/auth/htpasswd

# Deploy registry with docker-compose
cat <<EOF | sudo tee /opt/registry/docker-compose.yml
version: '3'

services:
  registry:
    image: registry:2
    container_name: internal-registry
    restart: always
    ports:
      - "5000:5000"
    environment:
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/registry.crt
      REGISTRY_HTTP_TLS_KEY: /certs/registry.key
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
    volumes:
      - /opt/registry/data:/data
      - /opt/registry/certs:/certs
      - /opt/registry/auth:/auth
EOF

# Start the registry
cd /opt/registry
docker-compose up -d

# Verify it's running
docker-compose logs
curl -u admin:password123 https://registry.internal.example.com:5000/v2/_catalog
```

## Syncing Images to the Internal Registry

Create a script to pull images from public registries and push them to your internal registry:

```bash
#!/bin/bash
# sync-images.sh

# Configuration
EXTERNAL_REGISTRY="docker.io"
INTERNAL_REGISTRY="registry.internal.example.com"
REGISTRY_USER="admin"
REGISTRY_PASS="password123"

# Login to internal registry
echo "${REGISTRY_PASS}" | docker login ${INTERNAL_REGISTRY} -u ${REGISTRY_USER} --password-stdin

# List of images to sync
IMAGES=(
  "nginx:latest"
  "redis:7.2"
  "postgres:16"
  "registry.k8s.io/kube-apiserver:v1.28.0"
  "registry.k8s.io/kube-controller-manager:v1.28.0"
  "registry.k8s.io/kube-scheduler:v1.28.0"
  "registry.k8s.io/kube-proxy:v1.28.0"
  "registry.k8s.io/pause:3.9"
  "registry.k8s.io/etcd:3.5.9-0"
  "registry.k8s.io/coredns/coredns:v1.10.1"
  "quay.io/calico/node:v3.26.1"
  "quay.io/calico/cni:v3.26.1"
  "quay.io/calico/kube-controllers:v3.26.1"
)

# Sync each image
for IMAGE in "${IMAGES[@]}"; do
  echo "Syncing ${IMAGE}..."

  # Pull from external registry
  docker pull ${IMAGE}

  # Tag for internal registry
  INTERNAL_IMAGE="${INTERNAL_REGISTRY}/${IMAGE}"
  docker tag ${IMAGE} ${INTERNAL_IMAGE}

  # Push to internal registry
  docker push ${INTERNAL_IMAGE}

  echo "Synced ${IMAGE} -> ${INTERNAL_IMAGE}"
done

echo "Image sync complete!"
```

Make it executable and run it:

```bash
chmod +x sync-images.sh
./sync-images.sh
```

For continuous synchronization, use Harbor's replication feature or create a cron job.

## Configuring Kubernetes to Use the Internal Registry

Configure containerd to use your internal registry:

```bash
# Create containerd configuration directory
sudo mkdir -p /etc/containerd/certs.d/registry.internal.example.com

# Configure registry endpoint
cat <<EOF | sudo tee /etc/containerd/certs.d/registry.internal.example.com/hosts.toml
server = "https://registry.internal.example.com"

[host."https://registry.internal.example.com"]
  capabilities = ["pull", "resolve", "push"]
  ca = "/etc/containerd/certs.d/registry.internal.example.com/ca.crt"
  skip_verify = false
EOF

# Copy CA certificate
sudo cp /data/cert/registry.crt /etc/containerd/certs.d/registry.internal.example.com/ca.crt

# Update containerd configuration
sudo nano /etc/containerd/config.toml
```

Add registry configuration:

```toml
[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"

  [plugins."io.containerd.grpc.v1.cri".registry.mirrors]
    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
      endpoint = ["https://registry.internal.example.com"]

    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."registry.k8s.io"]
      endpoint = ["https://registry.internal.example.com"]

    [plugins."io.containerd.grpc.v1.cri".registry.mirrors."quay.io"]
      endpoint = ["https://registry.internal.example.com"]

  [plugins."io.containerd.grpc.v1.cri".registry.configs]
    [plugins."io.containerd.grpc.v1.cri".registry.configs."registry.internal.example.com".auth]
      username = "admin"
      password = "password123"
```

Restart containerd:

```bash
sudo systemctl restart containerd
sudo systemctl status containerd
```

## Creating Image Pull Secrets

For Kubernetes to authenticate with your registry, create image pull secrets:

```bash
# Create registry credentials secret
kubectl create secret docker-registry internal-registry \
  --docker-server=registry.internal.example.com \
  --docker-username=admin \
  --docker-password=password123 \
  --docker-email=admin@example.com \
  -n default

# Create in other namespaces as needed
kubectl create secret docker-registry internal-registry \
  --docker-server=registry.internal.example.com \
  --docker-username=admin \
  --docker-password=password123 \
  --docker-email=admin@example.com \
  -n kube-system

# Configure default service account to use the secret
kubectl patch serviceaccount default \
  -p '{"imagePullSecrets": [{"name": "internal-registry"}]}' \
  -n default
```

Use the secret in pod specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: registry.internal.example.com/nginx:latest
  imagePullSecrets:
  - name: internal-registry
```

## Configuring kubeadm for Air-Gapped Installation

When initializing a cluster with kubeadm in an air-gapped environment:

```bash
# Create kubeadm configuration
cat <<EOF > kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
imageRepository: registry.internal.example.com/registry.k8s.io
networking:
  podSubnet: 10.244.0.0/16
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
  imagePullPolicy: IfNotPresent
EOF

# Pre-pull all required images
kubeadm config images list --config kubeadm-config.yaml

# Initialize cluster
sudo kubeadm init --config kubeadm-config.yaml
```

## Setting Up Registry Mirrors for System Components

Configure registry mirrors for critical system images:

```bash
# Create ConfigMap for kubelet image configuration
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubelet-config
  namespace: kube-system
data:
  kubelet: |
    apiVersion: kubelet.config.k8s.io/v1beta1
    kind: KubeletConfiguration
    imageGCHighThresholdPercent: 85
    imageGCLowThresholdPercent: 80
    imageMinimumGCAge: 2m
    registryPullQPS: 5
    registryBurst: 10
EOF
```

## Implementing Image Policy and Admission Control

Enforce that all images come from your internal registry:

```yaml
# Create admission webhook configuration
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-policy
webhooks:
- name: validate-image-registry.example.com
  clientConfig:
    service:
      name: image-validator
      namespace: default
      path: /validate
    caBundle: <base64-encoded-ca-cert>
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail
```

## Monitoring Registry Health and Usage

Monitor your internal registry:

```bash
# Check registry storage usage
du -sh /opt/registry/data

# View registry logs
docker-compose logs -f registry

# Query Harbor API for statistics
curl -u admin:password123 \
  https://registry.internal.example.com/api/v2.0/statistics

# Monitor disk space
df -h /opt/registry/data

# Check image pull metrics
kubectl top nodes
kubectl get events --all-namespaces | grep -i pull
```

Set up alerts:

```bash
# Create Prometheus monitoring for registry
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: harbor-metrics
  namespace: default
spec:
  ports:
  - port: 8001
    name: metrics
  selector:
    app: harbor
EOF
```

## Troubleshooting Common Issues

Debug image pull problems:

```bash
# Test registry connectivity
curl -v -u admin:password123 https://registry.internal.example.com/v2/_catalog

# Check certificate trust
openssl s_client -connect registry.internal.example.com:443 -CAfile /etc/containerd/certs.d/registry.internal.example.com/ca.crt

# Test image pull manually
sudo crictl pull registry.internal.example.com/nginx:latest

# View containerd configuration
sudo crictl info | grep -A 20 registry

# Check pod image pull errors
kubectl describe pod <pod-name> | grep -A 10 Events
kubectl get events --field-selector involvedObject.name=<pod-name>
```

An internal registry is essential for air-gapped Kubernetes deployments. Plan for sufficient storage capacity, implement regular image synchronization processes, and maintain proper backup procedures to ensure registry availability and reliability.
