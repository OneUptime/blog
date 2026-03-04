# How to Install and Configure Rancher for Kubernetes Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rancher, Kubernetes, Management, Containers

Description: Install Rancher on RHEL to provide a centralized management UI for multiple Kubernetes clusters.

---

Rancher is an open-source platform for managing Kubernetes clusters. It provides a web UI for cluster provisioning, application deployment, and multi-cluster management. Here is how to install Rancher on RHEL.

## Prerequisites

You need a Kubernetes cluster to host Rancher. For a quick single-node setup, use K3s:

```bash
# Install K3s (lightweight Kubernetes) on your RHEL server
curl -sfL https://get.k3s.io | sh -

# Verify K3s is running
sudo kubectl get nodes

# Set up kubeconfig for your user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config
```

## Installing cert-manager

Rancher requires cert-manager for TLS certificate management:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager pods to be ready
kubectl wait --for=condition=Ready pods --all -n cert-manager --timeout=120s

# Verify cert-manager
kubectl get pods -n cert-manager
```

## Installing Rancher via Helm

```bash
# Install Helm if not already installed
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add the Rancher Helm repository
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Install Rancher
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=your-admin-password \
  --set replicas=1

# Wait for Rancher to deploy
kubectl -n cattle-system rollout status deploy/rancher

# Verify Rancher pods
kubectl get pods -n cattle-system
```

## Firewall Configuration

```bash
# Open the required ports
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --reload
```

## Accessing the Rancher UI

```bash
# If you do not have DNS set up, add a hosts entry
echo "192.168.1.10 rancher.example.com" | sudo tee -a /etc/hosts

# Get the bootstrap password if you did not set one
kubectl get secret --namespace cattle-system bootstrap-secret \
  -o go-template='{{.data.bootstrapPassword|base64decode}}{{"\n"}}'

# Access Rancher at https://rancher.example.com
# Log in with admin / your-bootstrap-password
# Set a new admin password when prompted
```

## Importing an Existing Kubernetes Cluster

From the Rancher UI, you can import existing clusters:

```bash
# Rancher provides a kubectl command to register a cluster
# Copy it from the Rancher UI and run it on the target cluster
kubectl apply -f https://rancher.example.com/v3/import/YOUR_IMPORT_TOKEN.yaml

# Verify the cluster appears in Rancher
# Navigate to Cluster Management in the Rancher UI
```

## Deploying Applications from the Rancher Catalog

The Rancher UI includes a built-in app catalog:

```bash
# You can also deploy catalog apps via the Rancher CLI
# Install the Rancher CLI
curl -LO https://github.com/rancher/cli/releases/download/v2.8.0/rancher-linux-amd64-v2.8.0.tar.gz
tar xzf rancher-linux-amd64-v2.8.0.tar.gz
sudo mv rancher-v2.8.0/rancher /usr/local/bin/

# Log in to Rancher
rancher login https://rancher.example.com --token your-api-token
```

## Monitoring and Alerting

Rancher includes built-in monitoring based on Prometheus and Grafana:

```bash
# Enable monitoring from the Rancher UI:
# Cluster > Apps > Charts > Monitoring
# Or install via Helm on the downstream cluster

# This deploys Prometheus, Grafana, and Alertmanager
# accessible through the Rancher UI
```

Rancher simplifies multi-cluster Kubernetes management with a centralized UI, RBAC, and integrated monitoring.
