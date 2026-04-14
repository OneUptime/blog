# How to Use Dapr with MicroK8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MicroK8s, Kubernetes, Ubuntu, Local Development

Description: Install Dapr on Canonical MicroK8s for local development and single-node production deployments using built-in add-ons and Helm charts.

---

MicroK8s is Canonical's lightweight Kubernetes distribution packaged as a snap. It features built-in add-ons for common tools and is popular for local development on Ubuntu and for single-node production deployments on constrained hardware.

## Installing MicroK8s

```bash
# Install MicroK8s via snap
sudo snap install microk8s --classic --channel=1.32/stable

# Add user to microk8s group
sudo usermod -a -G microk8s $USER
sudo chown -R $USER ~/.kube
newgrp microk8s

# Wait for MicroK8s to be ready
microk8s status --wait-ready
```

## Enabling Required Add-ons

Enable DNS, storage, and Helm support needed for Dapr:

```bash
# Enable core add-ons
microk8s enable dns
microk8s enable hostpath-storage
microk8s enable helm3

# Optional: Enable ingress for external access
microk8s enable ingress

# Check add-on status
microk8s status
```

## Installing Dapr on MicroK8s

```bash
# Use MicroK8s's bundled helm3
microk8s helm3 repo add dapr https://dapr.github.io/helm-charts/
microk8s helm3 repo update

microk8s helm3 upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=false \
  --wait

# Configure kubectl alias
alias kubectl="microk8s kubectl"

# Verify
microk8s kubectl get pods -n dapr-system
```

## Installing the Dapr CLI

```bash
# Install Dapr CLI
curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | bash

# Point Dapr CLI to MicroK8s
export KUBECONFIG=/var/snap/microk8s/current/credentials/client.config

# Verify Dapr status
dapr status -k
```

## Enabling the Observability Stack

MicroK8s has a built-in Prometheus add-on that works with Dapr:

```bash
# Enable Prometheus + Grafana
microk8s enable observability

# Access Grafana (default credentials: admin/prom-operator)
microk8s kubectl port-forward \
  svc/kube-prom-stack-grafana \
  -n observability \
  3000:80
```

## Deploying a Dapr Application

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-dapr
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hello-dapr
  template:
    metadata:
      labels:
        app: hello-dapr
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "hello-dapr"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: hello-dapr
        image: ghcr.io/dapr/samples/hello-k8s-node:latest
        ports:
        - containerPort: 3000
```

```bash
microk8s kubectl apply -f app-deployment.yaml

# Verify sidecar injection
microk8s kubectl get pods -o wide
```

## Port Forwarding for Local Testing

```bash
# Forward the Dapr sidecar HTTP port
microk8s kubectl port-forward deployment/hello-dapr 3500:3500

# Test Dapr health endpoint
curl http://localhost:3500/v1.0/healthz
```

## Multi-Node MicroK8s Cluster

Add worker nodes to MicroK8s for a production-like setup:

```bash
# On the primary node, generate join token
microk8s add-node

# On each worker node, run the join command output above
microk8s join <ip>:<port>/<token>

# Verify cluster nodes
microk8s kubectl get nodes
```

## Summary

MicroK8s provides a one-command Kubernetes installation that works seamlessly with Dapr's Helm charts. The built-in add-ons for DNS, storage, and observability reduce setup time for Dapr development environments. MicroK8s's snap packaging ensures easy upgrades while maintaining compatibility with standard Kubernetes tooling including Helm and kubectl.
