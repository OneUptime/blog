# How to Install Portainer Server on Kubernetes via Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, Installation, DevOps

Description: Learn how to deploy Portainer Server on a Kubernetes cluster using the official Helm chart.

## Prerequisites

- A working and up-to-date Kubernetes cluster
- Cluster-admin access to the Kubernetes cluster
- A default StorageClass configured for persistent storage
- `kubectl` configured to access the cluster
- Helm 3 installed
- A Portainer Business Edition license key (for Business Edition installs)

## Adding the Portainer Helm Repository

```bash
# Add the official Portainer Helm repository

helm repo add portainer https://portainer.github.io/k8s/

# Update your local Helm chart cache
helm repo update
```

## Installing Portainer (Community Edition)

```bash
# Create the portainer namespace
kubectl create namespace portainer

# Install Portainer using Helm with NodePort service (default)
helm install portainer portainer/portainer \
  --namespace portainer \
  --set service.type=NodePort
```

## Installing Portainer (Business Edition)

```bash
# Install Portainer Business Edition
helm install portainer portainer/portainer \
  --namespace portainer \
  --set enterpriseEdition.enabled=true \
  --set service.type=LoadBalancer
```

## Customizing the Installation

Create a `values.yaml` file to customize the deployment:

```yaml
# values.yaml - Portainer Helm customization

# Service type: NodePort, LoadBalancer, or ClusterIP
service:
  type: LoadBalancer
  httpPort: 9000
  httpsPort: 9443
  edgePort: 8000

# Persistent storage for Portainer data
persistence:
  enabled: true
  size: 10Gi
  # Specify a storage class, or leave empty for default
  storageClass: ""

# Set resource limits for the Portainer pod
resources:
  limits:
    cpu: "1"
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

```bash
# Install using the custom values file
helm install portainer portainer/portainer \
  --namespace portainer \
  -f values.yaml
```

## Verifying the Installation

```bash
# Check that Portainer pods are running
kubectl get pods --namespace portainer

# Check the service to find the external IP or NodePort
kubectl get service --namespace portainer

# Watch for the LoadBalancer external IP to be assigned
kubectl get service portainer --namespace portainer --watch
```

## Accessing Portainer

Once the service is available:

- **NodePort**: `http://<node-ip>:30777` or `https://<node-ip>:30779`
- **LoadBalancer**: `http://<external-ip>:9000` or `https://<external-ip>:9443`

On first access, Portainer prompts you to create an admin account. Complete setup within 5 minutes or the initialization window expires.

## Upgrading Portainer

```bash
# Update Helm repos to get the latest chart version
helm repo update

# Upgrade Portainer using the existing release values
helm upgrade portainer portainer/portainer \
  --namespace portainer \
  --reuse-values
```

## Conclusion

Installing Portainer via Helm is the cleanest way to deploy it on Kubernetes. The official chart handles persistent volume claims, service configuration, and upgrade paths cleanly with minimal manual intervention.
