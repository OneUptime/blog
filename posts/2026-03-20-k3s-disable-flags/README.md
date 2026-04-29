# How to Configure K3s Disable Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Configuration, Disable Flags, Optimization

Description: Learn how to use K3s disable flags to turn off built-in components and replace them with alternatives suited to your environment.

## Introduction

K3s comes with a curated set of built-in components that make it functional out of the box: Traefik ingress, ServiceLB, metrics-server, local storage provisioner, and CoreDNS. While these defaults are excellent for most scenarios, production environments often require replacing one or more components with alternatives better suited to the infrastructure. K3s's `disable` flag makes this straightforward.

## Available Components to Disable

| Component | Description | Common Replacement |
|-----------|-------------|-------------------|
| `traefik` | Ingress controller | NGINX Ingress, Kong, Istio |
| `servicelb` | ServiceLB (Klipper) | MetalLB, cloud LB |
| `metrics-server` | Kubernetes Metrics Server | Prometheus + adapter |
| `local-storage` | Local path provisioner | Longhorn, Rook, NFS |
| `coredns` | Cluster DNS | Your own CoreDNS deployment |

## Disabling Components at Installation

### Using the Config File (Recommended)

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"
disable:
  - traefik
  - servicelb
  - metrics-server
EOF

# Install K3s

curl -sfL https://get.k3s.io | sudo sh -
```

### Using Environment Variables

```bash
# Disable components at install time via environment variables
curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="--disable traefik --disable servicelb" \
    sh -s -
```

### Using Command Line Flags

```bash
# Direct flag usage (same as config file)
curl -sfL https://get.k3s.io | \
    sh -s - server \
    --disable traefik \
    --disable servicelb
```

## Disabling Components on an Existing Cluster

To disable a component that is already running:

```bash
# Create a config drop-in file
sudo mkdir -p /etc/rancher/k3s/config.yaml.d

sudo tee /etc/rancher/k3s/config.yaml.d/disable-components.yaml > /dev/null <<EOF
disable+:
  - traefik
  - servicelb
EOF

# Restart K3s on each server to apply changes
sudo systemctl restart k3s

# K3s will uninstall the previously deployed packaged components
# Monitor deletion
kubectl get pods -n kube-system -w
```

## Component-Specific Disable Scenarios

### Disable Traefik and Install NGINX Ingress

```bash
# Disable Traefik in config
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"
disable:
  - traefik
EOF

# Install NGINX Ingress after K3s is running
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace
```

### Disable ServiceLB and Install MetalLB

```bash
# Disable ServiceLB
# Add to a config drop-in file
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/disable-servicelb.yaml > /dev/null <<EOF
disable+:
  - servicelb
EOF

# On multi-server clusters, apply the same setting on every server
sudo systemctl restart k3s

# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml

# Wait for MetalLB to be ready
kubectl -n metallb-system wait --for=condition=Ready pod --all --timeout=120s

# Configure MetalLB with an IP address pool
kubectl apply -f - <<EOF
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: production
  namespace: metallb-system
EOF
```

### Disable Metrics Server

```bash
# Add to a config drop-in file
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/disable-metrics-server.yaml > /dev/null <<EOF
disable+:
  - metrics-server
EOF
sudo systemctl restart k3s

# Install a custom metrics server with specific configuration
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update

helm upgrade --install metrics-server metrics-server/metrics-server \
    --namespace kube-system \
    --set args[0]=--kubelet-insecure-tls  # Only for dev/testing
```

### Disable Local Storage Provisioner

```bash
# Add to a config drop-in file
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/disable-local-storage.yaml > /dev/null <<EOF
disable+:
  - local-storage
EOF

sudo systemctl restart k3s

# Install Longhorn for production storage
helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
    --namespace longhorn-system \
    --create-namespace \
    --set defaultSettings.defaultReplicaCount=2
```

## Verifying Disabled Components

```bash
# Check that the disabled components' pods are gone
kubectl get pods -n kube-system

# Confirm no Traefik pods running
kubectl get pods -n kube-system | grep traefik
# Should return empty

# Confirm no servicelb pods
kubectl get pods -n kube-system | grep svclb
# Should return empty

# Check the K3s AddOn resources for packaged components
kubectl get addons.k3s.cattle.io -n kube-system
# Disabled packaged components should not appear here
```

## Re-Enabling a Component

To re-enable a component you previously disabled:

```bash
# Remove the component from the disable list in config.yaml
# or delete the relevant drop-in file under /etc/rancher/k3s/config.yaml.d/
sudo nano /etc/rancher/k3s/config.yaml
# Remove the relevant line from the disable section

# Restart K3s
sudo systemctl restart k3s

# K3s will redeploy the component from its packaged manifest or Helm chart
kubectl get pods -n kube-system -w
```

## Helm Override Configuration

Instead of disabling components, you can also customize them using HelmChartConfig:

```yaml
# Customize Traefik instead of disabling it
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    deployment:
      replicas: 2
    service:
      type: LoadBalancer
    providers:
      kubernetesIngress:
        publishedService:
          enabled: true
```

```bash
kubectl apply -f traefik-config.yaml
```

## Complete Minimal Configuration (Disable All Optional Components)

```yaml
# /etc/rancher/k3s/config.yaml - Bare minimum K3s
token: "ClusterToken"

# Disable all optional components for a barebones cluster
disable:
  - coredns
  - traefik
  - servicelb
  - metrics-server
  - local-storage

# Install only what you need
# You are responsible for providing:
# - A cluster DNS provider
# - An ingress controller
# - A load balancer solution
# - A storage provisioner
# - Optionally: metrics-server or Prometheus adapter
```

## Conclusion

K3s's `disable` flag provides fine-grained control over which built-in components are deployed. This is essential when you need to replace defaults with alternatives better suited to your infrastructure - such as MetalLB instead of ServiceLB, NGINX instead of Traefik, or Longhorn instead of local-storage. Always verify that your replacement components are properly deployed before disabling the defaults in production, to avoid service interruptions.
