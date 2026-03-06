# How to Set Up Flux CD on VMware Tanzu Kubernetes Grid

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, vmware tanzu, tkg, kubernetes, gitops, continuous delivery, vsphere

Description: A practical guide to deploying Flux CD on VMware Tanzu Kubernetes Grid for enterprise GitOps workflows on vSphere infrastructure.

---

## Introduction

VMware Tanzu Kubernetes Grid (TKG) is an enterprise Kubernetes platform that runs on vSphere, AWS, and Azure. It uses Cluster API to manage the lifecycle of workload clusters and provides a consistent Kubernetes experience across environments. Integrating Flux CD with TKG brings GitOps-driven application delivery to your VMware infrastructure.

This guide covers deploying Flux CD on a TKG workload cluster and setting up a complete GitOps pipeline for application management.

## Prerequisites

Before you begin, ensure you have:

- A vSphere 7.0+ environment with at least 32 GB RAM and 8 CPU cores available
- VMware Tanzu CLI installed
- A TKG management cluster deployed
- `kubectl` and `flux` CLI tools installed
- A GitHub account with a personal access token
- Network access from the TKG cluster to your Git repository

## Installing the Flux CLI

Install the Flux CLI on your workstation:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Creating a TKG Workload Cluster

If you do not already have a workload cluster, create one using the Tanzu CLI:

```bash
# List available Kubernetes versions
tanzu kubernetes-release get

# Create a workload cluster configuration
tanzu cluster create flux-workload \
  --plan dev \
  --infrastructure vsphere \
  --controlplane-machine-count 1 \
  --worker-machine-count 3 \
  --vsphere-controlplane-endpoint 10.0.0.100
```

Alternatively, use a cluster configuration file for more control:

```yaml
# flux-workload-cluster.yaml
# TKG workload cluster configuration for Flux CD
CLUSTER_NAME: flux-workload
CLUSTER_PLAN: dev
INFRASTRUCTURE_PROVIDER: vsphere
VSPHERE_SERVER: vcenter.example.com
VSPHERE_USERNAME: administrator@vsphere.local
VSPHERE_DATACENTER: /dc01
VSPHERE_DATASTORE: /dc01/datastore/vsanDatastore
VSPHERE_NETWORK: /dc01/network/k8s-network
VSPHERE_RESOURCE_POOL: /dc01/host/cluster01/Resources/k8s-pool
VSPHERE_FOLDER: /dc01/vm/k8s-vms
VSPHERE_CONTROL_PLANE_ENDPOINT: 10.0.0.100
CONTROL_PLANE_MACHINE_COUNT: 1
WORKER_MACHINE_COUNT: 3
VSPHERE_CONTROL_PLANE_NUM_CPUS: 2
VSPHERE_CONTROL_PLANE_MEM_MIB: 8192
VSPHERE_CONTROL_PLANE_DISK_GIB: 40
VSPHERE_WORKER_NUM_CPUS: 4
VSPHERE_WORKER_MEM_MIB: 16384
VSPHERE_WORKER_DISK_GIB: 80
OS_NAME: ubuntu
OS_VERSION: "22.04"
ENABLE_DEFAULT_STORAGE_CLASS: true
```

```bash
# Create the cluster from the config file
tanzu cluster create -f flux-workload-cluster.yaml

# Monitor the cluster creation
tanzu cluster list
```

## Getting Cluster Credentials

Retrieve the kubeconfig for your workload cluster:

```bash
# Get credentials for the workload cluster
tanzu cluster kubeconfig get flux-workload --admin --export-file ~/.kube/tkg-flux-config

# Set KUBECONFIG
export KUBECONFIG=~/.kube/tkg-flux-config

# Verify cluster access
kubectl get nodes
kubectl cluster-info
```

## Running Flux Pre-flight Checks

Verify the TKG cluster meets Flux requirements:

```bash
# Run pre-flight checks
flux check --pre
```

TKG clusters include all required Kubernetes APIs and RBAC capabilities needed by Flux.

## Bootstrapping Flux CD

Set up your GitHub credentials and bootstrap Flux:

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD on the TKG cluster
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=tkg-gitops \
  --branch=main \
  --path=./clusters/tkg-workload \
  --personal \
  --components-extra=image-reflector-controller,image-automation-controller
```

The `--components-extra` flag installs the image automation controllers, which are useful for automated container image updates in enterprise environments.

## Verifying the Flux Installation

Confirm all Flux controllers are running:

```bash
# Verify Flux health
flux check

# List all Flux pods
kubectl get pods -n flux-system

# Check Git source status
flux get sources git
```

## Setting Up the Repository Structure

Organize your GitOps repository for TKG:

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/tkg-gitops.git
cd tkg-gitops

# Create directory structure
mkdir -p clusters/tkg-workload/infrastructure
mkdir -p clusters/tkg-workload/apps
mkdir -p infrastructure/sources
mkdir -p infrastructure/controllers
mkdir -p infrastructure/rbac
mkdir -p apps/base
mkdir -p apps/staging
mkdir -p apps/production
```

## Configuring vSphere Storage with Flux

TKG on vSphere includes the vSphere CSI driver. Ensure the default StorageClass is configured:

```yaml
# infrastructure/storage/vsphere-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.vsphere.vmware.com
parameters:
  # Use the vSAN default storage policy
  storagepolicyname: "vSAN Default Storage Policy"
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Deploying Infrastructure Components

Set up an ingress controller and cert-manager through Flux:

```yaml
# infrastructure/sources/helm-repos.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes.github.io/ingress-nginx
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.jetstack.io
```

```yaml
# infrastructure/controllers/ingress.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: ingress-nginx
      version: ">=4.8.0"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  targetNamespace: ingress-system
  install:
    createNamespace: true
  values:
    controller:
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
      # TKG supports LoadBalancer services via NSX or MetalLB
      service:
        type: LoadBalancer
```

```yaml
# infrastructure/controllers/cert-manager.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: cert-manager
      version: ">=1.13.0"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  targetNamespace: cert-manager
  install:
    createNamespace: true
    crds: CreateReplace
  values:
    installCRDs: true
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

Wire infrastructure components into the cluster configuration:

```yaml
# clusters/tkg-workload/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/sources/helm-repos.yaml
  - ../../../infrastructure/controllers/ingress.yaml
  - ../../../infrastructure/controllers/cert-manager.yaml
```

```yaml
# clusters/tkg-workload/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/tkg-workload/infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

## Deploying Applications

Create a production-ready application deployment:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    managed-by: flux
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tanzu-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tanzu-app
  template:
    metadata:
      labels:
        app: tanzu-app
    spec:
      containers:
        - name: app
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 3
            periodSeconds: 5
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: tanzu-app
  namespace: production
spec:
  selector:
    app: tanzu-app
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

```yaml
# apps/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tanzu-app
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tanzu-app
                port:
                  number: 80
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

```yaml
# clusters/tkg-workload/apps/production-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: tanzu-app
      namespace: production
  timeout: 3m
```

## Configuring Image Automation

Set up automated container image updates for your TKG workloads:

```yaml
# clusters/tkg-workload/apps/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: tanzu-app
  namespace: flux-system
spec:
  image: harbor.example.com/apps/tanzu-app
  interval: 5m
  # If using Harbor with TKG
  secretRef:
    name: harbor-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: tanzu-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: tanzu-app
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: tanzu-app-automation
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-automation
        email: flux@example.com
      messageTemplate: "chore: update tanzu-app to {{.NewValue}}"
    push:
      branch: main
  update:
    path: ./apps/base
    strategy: Setters
```

## Integrating with TKG Packages

TKG comes with a set of packages managed through the Tanzu CLI. You can use Flux alongside TKG packages:

```bash
# List available TKG packages
tanzu package available list

# Flux manages your application workloads
# TKG packages manage infrastructure add-ons
# Both coexist without conflict
```

## Setting Up Notifications

Configure Flux notifications for deployment events:

```yaml
# clusters/tkg-workload/apps/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: tkg-deployments
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Troubleshooting

Common debugging commands for Flux on TKG:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller
kubectl logs -n flux-system deploy/helm-controller

# Force reconciliation
flux reconcile kustomization flux-system --with-source

# Check TKG cluster health
tanzu cluster list --include-management-cluster

# Verify the Cluster API resources
kubectl get clusters -A

# View Flux events
flux events

# Suspend and resume reconciliation during maintenance
flux suspend kustomization production-app
flux resume kustomization production-app
```

## Conclusion

You now have Flux CD running on VMware Tanzu Kubernetes Grid. This integration brings GitOps-driven application delivery to your vSphere infrastructure, complementing TKG's lifecycle management capabilities. With Flux handling application deployments and TKG managing the cluster infrastructure, you have a complete enterprise Kubernetes platform where every change is version-controlled and automatically reconciled.
