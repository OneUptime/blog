# How to Install Portainer Server on Kubernetes via Helm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, Installation, DevOps

Description: Learn how to deploy Portainer Server on a Kubernetes cluster using the official Helm chart for production-ready container management.

## Introduction

Installing Portainer on Kubernetes via Helm is the recommended approach for production deployments. The Helm chart handles all Kubernetes resources - Deployment, Service, PersistentVolumeClaim, and RBAC - with sensible defaults that you can customize. This guide covers the complete installation process.

## Prerequisites

- Kubernetes cluster running a Portainer-supported version and accessible
- Helm 3.x installed locally
- `kubectl` configured with cluster access
- A StorageClass configured for persistent volumes
- Cluster-admin access to the cluster
- A Portainer BE license key if you plan to install Business Edition

## Step 1: Add the Portainer Helm Repository

```bash
# Add the Portainer Helm repository

helm repo add portainer https://portainer.github.io/k8s/

# Update repository to get latest charts
helm repo update

# Verify the repository is added
helm repo list
# NAME       URL
# portainer  https://portainer.github.io/k8s/

# List available Portainer chart versions
helm search repo portainer/portainer --versions
```

## Step 2: Create a Namespace for Portainer

```bash
# Create the portainer namespace
kubectl create namespace portainer

# Verify
kubectl get namespace portainer
```

## Step 3: Install Portainer CE with Default Settings

For a quick installation with defaults:

```bash
# Install with the default NodePort service (port 30777 for HTTP, 30779 for HTTPS)
helm install portainer portainer/portainer \
  --namespace portainer
```

## Step 4: Install Portainer with Custom Values

For production installations, create a values file:

```yaml
# portainer-values.yaml

# Service configuration
service:
  type: ClusterIP    # Use ClusterIP when exposing Portainer through Ingress

# Ingress configuration (optional)
ingress:
  enabled: true
  ingressClassName: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
  hosts:
    - host: portainer.example.com
      paths:
        - path: /
  tls:
    - secretName: portainer-tls
      hosts:
        - portainer.example.com

# Persistent storage
persistence:
  enabled: true
  size: 10Gi
  storageClass: "standard"    # Your cluster's StorageClass name
  # For cloud providers:
  # storageClass: "gp2"         # AWS EBS
  # storageClass: "managed-premium"  # Azure
  # storageClass: "pd-ssd"     # GCP

# Resource requests and limits
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 256Mi

# Admin configuration
adminPassword:
  existingSecret: ""    # Set in next step using a Kubernetes secret
```

```bash
# Install with custom values
helm install portainer portainer/portainer \
  --namespace portainer \
  --values portainer-values.yaml
```

## Step 5: Set the Admin Password via Secret

```bash
# Create the admin password secret before the first install
kubectl create secret generic portainer-admin-password \
  --from-literal=password="MySecureAdminPassword!" \
  --namespace portainer
```

Or include in the Helm values:

```yaml
# portainer-values.yaml
adminPassword:
  existingSecret: portainer-admin-password
```

## Step 6: Monitor the Installation

```bash
# Watch pods start
kubectl get pods -n portainer -w

# Expected output after ~30 seconds:
# NAME                         READY   STATUS    RESTARTS   AGE
# portainer-xxxx-xxxx          1/1     Running   0          45s

# Check the service
kubectl get svc -n portainer

# Check PVC
kubectl get pvc -n portainer
```

## Step 7: Access Portainer

```bash
# Get the NodePort (if using NodePort service type)
kubectl get svc portainer -n portainer
# Look for 30777/TCP (HTTP) and 30779/TCP (HTTPS) in the PORT(S) column

# Access at:
# HTTP:  http://<node-ip>:30777
# HTTPS: https://<node-ip>:30779
```

For LoadBalancer:

```bash
# Get external IP
kubectl get svc portainer -n portainer
# EXTERNAL-IP: 203.0.113.1
# Access at: https://203.0.113.1:9443
```

For Ingress:

```text
# Access at: https://portainer.example.com
```

## Step 8: Complete Initial Setup

1. Open the Portainer URL
2. Create the initial admin user, or if you set `adminPassword.existingSecret`, log in with the automatically created `admin` user
3. Select **Get Started** to connect to the local Kubernetes cluster

Portainer automatically detects the Kubernetes environment it's running in.

## Step 9: Install Portainer BE

For Business Edition, use the same chart and enable Enterprise Edition:

```bash
helm install portainer portainer/portainer \
  --namespace portainer \
  --set enterpriseEdition.enabled=true \
  --set enterpriseEdition.image.tag=lts \
  --values portainer-values.yaml
```

## Step 10: Upgrade Portainer

```bash
# Update Helm repository
helm repo update

# Upgrade to latest version
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --values portainer-values.yaml

# Upgrade to a specific chart version
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --version <chart-version> \
  --values portainer-values.yaml
```

## Uninstalling Portainer

```bash
# Uninstall the release
helm uninstall portainer --namespace portainer

# If you used persistence.existingClaim, delete that PVC separately to remove data
kubectl delete pvc <existing-pvc-name> -n portainer

# Delete namespace
kubectl delete namespace portainer
```

## Conclusion

Installing Portainer on Kubernetes via Helm is the cleanest and most maintainable approach. The Helm chart handles all the Kubernetes complexity while allowing extensive customization through values files. Use NodePort for testing, LoadBalancer or Ingress for production, and always configure persistent storage to preserve Portainer's configuration across pod restarts.
