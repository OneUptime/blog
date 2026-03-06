# How to Set Up Flux CD on Hetzner Cloud Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, hetzner cloud, kubernetes, gitops, csi driver, hcloud

Description: Learn how to set up Flux CD on Hetzner Cloud Kubernetes with CSI driver integration for persistent storage and a complete GitOps workflow.

---

## Introduction

Hetzner Cloud offers cost-effective cloud infrastructure that is popular for running Kubernetes clusters. While Hetzner does not provide a managed Kubernetes service in the same way as the major cloud providers, you can use tools like k3s or kubeadm to create clusters on Hetzner Cloud servers. Flux CD brings GitOps automation to these clusters, and the Hetzner CSI driver provides native persistent volume support.

This guide covers provisioning a Kubernetes cluster on Hetzner Cloud, bootstrapping Flux CD, and integrating the Hetzner CSI driver for storage.

## Prerequisites

- A Hetzner Cloud account
- hcloud CLI installed and configured
- kubectl installed
- Flux CLI installed
- A GitHub account and personal access token
- SSH key registered with Hetzner Cloud

## Step 1: Provision Servers on Hetzner Cloud

Create servers that will form your Kubernetes cluster.

```bash
# Create the control plane node
hcloud server create \
  --name k8s-control-1 \
  --type cx31 \
  --image ubuntu-22.04 \
  --ssh-key my-ssh-key \
  --location nbg1

# Create worker nodes
hcloud server create \
  --name k8s-worker-1 \
  --type cx31 \
  --image ubuntu-22.04 \
  --ssh-key my-ssh-key \
  --location nbg1

hcloud server create \
  --name k8s-worker-2 \
  --type cx31 \
  --image ubuntu-22.04 \
  --ssh-key my-ssh-key \
  --location nbg1
```

## Step 2: Install Kubernetes with k3s

Install k3s on the control plane node and join the workers.

```bash
# On the control plane node, install k3s
# The --disable local-storage flag is used so we can use Hetzner CSI instead
ssh root@<control-plane-ip> \
  "curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC='--disable local-storage --disable traefik' sh -"

# Get the node token
ssh root@<control-plane-ip> "cat /var/lib/rancher/k3s/server/node-token"

# On each worker node, join the cluster
ssh root@<worker-1-ip> \
  "curl -sfL https://get.k3s.io | K3S_URL=https://<control-plane-ip>:6443 K3S_TOKEN=<node-token> sh -"

ssh root@<worker-2-ip> \
  "curl -sfL https://get.k3s.io | K3S_URL=https://<control-plane-ip>:6443 K3S_TOKEN=<node-token> sh -"
```

Copy the kubeconfig to your local machine:

```bash
# Copy kubeconfig from the control plane
scp root@<control-plane-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/hetzner-config

# Update the server address in the kubeconfig
sed -i 's/127.0.0.1/<control-plane-ip>/g' ~/.kube/hetzner-config

# Set the KUBECONFIG environment variable
export KUBECONFIG=~/.kube/hetzner-config

# Verify the cluster
kubectl get nodes
```

## Step 3: Create a Hetzner Cloud API Token

Generate an API token that the CSI driver and Cloud Controller Manager will use.

```bash
# Create a read/write API token in the Hetzner Cloud Console
# Store it as a Kubernetes secret
kubectl create namespace kube-system --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic hcloud-token \
  --namespace kube-system \
  --from-literal=token=<your-hcloud-api-token>
```

## Step 4: Bootstrap Flux CD

Bootstrap Flux onto your Hetzner Cloud Kubernetes cluster.

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-hetzner-config \
  --branch=main \
  --path=clusters/hetzner-production \
  --personal
```

Verify the installation:

```bash
# Check Flux health
flux check

# List running Flux controllers
kubectl get pods -n flux-system
```

## Step 5: Install Hetzner CSI Driver via Flux

The Hetzner CSI driver enables dynamic provisioning of Hetzner Cloud Volumes as Kubernetes persistent volumes.

Create the Helm repository source:

```yaml
# infrastructure/hetzner-csi/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: hetzner-csi
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.hetzner.cloud
```

Create the HelmRelease for the CSI driver:

```yaml
# infrastructure/hetzner-csi/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: hcloud-csi
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: hcloud-csi
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: hetzner-csi
        namespace: flux-system
  values:
    # Use the existing hcloud-token secret
    storageClasses:
      - name: hcloud-volumes
        defaultStorageClass: true
        reclaimPolicy: Retain
```

Create the infrastructure Kustomization:

```yaml
# clusters/hetzner-production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure
  prune: true
  wait: true
  timeout: 5m
```

## Step 6: Install Hetzner Cloud Controller Manager

The Cloud Controller Manager integrates your cluster with Hetzner Cloud services such as load balancers and node metadata.

```yaml
# infrastructure/hetzner-ccm/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: hetzner-ccm
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.hetzner.cloud

---
# infrastructure/hetzner-ccm/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: hcloud-ccm
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: hcloud-cloud-controller-manager
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: hetzner-ccm
        namespace: flux-system
  values:
    networking:
      # Enable if using Hetzner private networks
      enabled: true
      clusterCIDR: 10.244.0.0/16
```

## Step 7: Deploy an Application with Persistent Storage

Create an application that uses Hetzner Cloud Volumes for storage:

```yaml
# apps/postgres/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: database

---
# apps/postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        # Use the Hetzner CSI storage class
        storageClassName: hcloud-volumes
        resources:
          requests:
            # Hetzner volumes minimum size is 10Gi
            storage: 10Gi

---
# apps/postgres/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: database
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

Create the apps Kustomization:

```yaml
# clusters/hetzner-production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
  wait: true
  dependsOn:
    # Wait for CSI driver and CCM to be ready
    - name: infrastructure
```

## Step 8: Set Up Ingress with Hetzner Load Balancer

Deploy an ingress controller that integrates with Hetzner Cloud Load Balancers:

```yaml
# infrastructure/ingress-nginx/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      service:
        annotations:
          # Hetzner Load Balancer annotations
          load-balancer.hetzner.cloud/name: "flux-lb"
          load-balancer.hetzner.cloud/location: "nbg1"
          load-balancer.hetzner.cloud/use-private-ip: "true"
          load-balancer.hetzner.cloud/health-check-interval: "5s"
```

## Step 9: Configure Notifications

Set up Flux notifications to monitor deployments:

```yaml
# clusters/hetzner-production/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: discord
  namespace: flux-system
spec:
  type: discord
  channel: deployments
  secretRef:
    name: discord-webhook-url

---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: hetzner-alerts
  namespace: flux-system
spec:
  providerRef:
    name: discord
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 10: Verify the Setup

Confirm that all components are working correctly:

```bash
# Check Flux resources
flux get all

# Verify CSI driver is running
kubectl get pods -n kube-system | grep csi

# Verify storage class is available
kubectl get storageclass

# Check that persistent volumes are provisioned
kubectl get pvc -n database

# Verify load balancer was created
hcloud load-balancer list
```

## Troubleshooting

### CSI Driver Volume Mounting Issues

```bash
# Check CSI driver pods
kubectl get pods -n kube-system -l app=hcloud-csi

# View CSI driver logs
kubectl logs -n kube-system -l app=hcloud-csi-controller

# Verify the hcloud token secret exists
kubectl get secret hcloud-token -n kube-system
```

### Node Not Ready

```bash
# Check if the Cloud Controller Manager is running
kubectl get pods -n kube-system -l app=hcloud-cloud-controller-manager

# View node conditions
kubectl describe node <node-name>
```

### Flux Source Errors

```bash
# Check Git source status
flux get sources git

# Force reconciliation
flux reconcile source git flux-system

# View source controller logs
kubectl logs -n flux-system deployment/source-controller
```

## Conclusion

You now have a Flux CD-managed Kubernetes cluster running on Hetzner Cloud with CSI driver integration for persistent storage and Cloud Controller Manager for load balancer support. This setup provides a cost-effective yet production-capable GitOps workflow. You can extend it further by adding monitoring, backup solutions, and additional applications to your Git repository.
