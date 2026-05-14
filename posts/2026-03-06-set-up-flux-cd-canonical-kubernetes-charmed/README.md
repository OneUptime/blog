# How to Set Up Flux CD on Canonical Kubernetes (Charmed K8s)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Canonical kubernetes, Charmed Kubernetes, Juju, GitOps, Ubuntu, Continuous Delivery

Description: A comprehensive guide to deploying Flux CD on Canonical's Charmed Kubernetes, leveraging Juju for cluster management and Flux for GitOps workflows.

---

## Introduction

Charmed Kubernetes is Canonical's enterprise-grade Kubernetes distribution, deployed and managed using Juju, Canonical's application modeling tool. It provides a composable, operator-driven approach to Kubernetes cluster management on Ubuntu. Integrating Flux CD with Charmed Kubernetes enables a GitOps workflow where your application deployments and cluster configurations are driven entirely from Git.

This guide walks through deploying a Charmed Kubernetes cluster with Juju and setting up Flux CD for continuous delivery.

## Prerequisites

Before starting, ensure you have:

- An Ubuntu 22.04 or later machine with at least 32 GB RAM and 128 GB SSD storage for local LXD deployments, or a cloud substrate like AWS, GCP, or OpenStack
- Juju 3.x installed
- A Juju cloud configured (LXD for local deployments, or a cloud provider)
- A GitHub account with a personal access token
- `kubectl` and `flux` CLI installed

## Installing Juju and Setting Up a Cloud

Install Juju and configure a cloud provider:

```bash
# Install Juju via snap

sudo snap install juju --channel=3/stable

# For local development, set up LXD as the cloud
sudo snap install lxd
lxd init --auto

# Bootstrap a Juju controller on LXD
juju bootstrap localhost lxd-controller

# Create a model for the Kubernetes cluster
juju add-model k8s-flux
```

## Deploying Charmed Kubernetes

Deploy a Charmed Kubernetes cluster using a Juju bundle:

```bash
# Deploy the Charmed Kubernetes bundle
juju deploy charmed-kubernetes --channel=1.35/stable

# When deploying into local LXD containers, apply the documented container settings
juju config calico ignore-loose-rpf=true
touch $HOME/empty.tgz
juju attach-resource containerd containerd=$HOME/empty.tgz

# Monitor the deployment progress
juju status --watch 5s
```

For a smaller footprint suitable for testing, use the Kubernetes Core bundle:

```bash
# Deploy the Kubernetes Core bundle
juju deploy kubernetes-core --channel=1.35/stable

# Wait for all units to become active/idle
juju status --watch 10s
```

## Retrieving kubectl Configuration

Once the cluster is ready, fetch the kubeconfig:

```bash
# Create the .kube directory
mkdir -p ~/.kube

# Retrieve kubeconfig from the control plane leader
juju ssh kubernetes-control-plane/leader -- cat config > ~/.kube/charmed-config

# Set KUBECONFIG
export KUBECONFIG=~/.kube/charmed-config

# Verify cluster access
kubectl get nodes
kubectl get pods -n kube-system
```

## Installing the Flux CLI

If you have not installed the Flux CLI yet:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify installation
flux --version
```

## Running Pre-flight Checks

Run the Flux pre-flight checks against the Charmed Kubernetes cluster:

```bash
# Check cluster compatibility
flux check --pre
```

All checks should pass. Charmed Kubernetes provides a standard, CNCF-conformant cluster.

## Bootstrapping Flux CD

Configure your GitHub credentials and bootstrap Flux:

```bash
# Set GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=charmed-k8s-gitops \
  --branch=main \
  --path=./clusters/charmed \
  --personal=true
```

## Verifying Flux Components

Confirm all Flux controllers are running:

```bash
# Check Flux health
flux check

# List Flux pods
kubectl get pods -n flux-system

# View all Flux sources
flux get sources all
```

## Organizing the GitOps Repository

Set up a structured repository layout:

```bash
# Clone the GitOps repository
git clone https://github.com/$GITHUB_USER/charmed-k8s-gitops.git
cd charmed-k8s-gitops

# Create the directory structure
mkdir -p clusters/charmed/infrastructure
mkdir -p clusters/charmed/apps
mkdir -p infrastructure/sources
mkdir -p infrastructure/storage
mkdir -p infrastructure/controllers
mkdir -p apps/base
mkdir -p apps/production
```

Add a cluster-level Kustomize file so Flux includes the application and infrastructure directories under the bootstrap path:

```yaml
# clusters/charmed/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - flux-system
  - apps
  - infrastructure
```

## Deploying Infrastructure Components

If your Charmed Kubernetes cluster is integrated with Ceph CSI, define a matching StorageClass for stateful workloads:

```yaml
# infrastructure/storage/ceph-csi.yaml
# This StorageClass assumes Ceph CSI, its secrets, and the target pool already exist
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rbd.csi.ceph.com
parameters:
  clusterID: <your-ceph-cluster-id>
  pool: kubernetes
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: csi-rbd-secret
  csi.storage.k8s.io/provisioner-secret-namespace: ceph-system
  csi.storage.k8s.io/node-stage-secret-name: csi-rbd-secret
  csi.storage.k8s.io/node-stage-secret-namespace: ceph-system
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - discard
```

## Deploying Applications with Kustomize

Create an application deployment:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: web-apps
  labels:
    managed-by: flux
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-charmed
  namespace: web-apps
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-charmed
  template:
    metadata:
      labels:
        app: hello-charmed
    spec:
      containers:
        - name: hello
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-charmed
  namespace: web-apps
spec:
  selector:
    app: hello-charmed
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
```

Create the Flux Kustomization to deploy the application:

```yaml
# clusters/charmed/apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - hello-app.yaml
```

```yaml
# clusters/charmed/apps/hello-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: hello-charmed
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: hello-charmed
      namespace: web-apps
  timeout: 3m
```

## Deploying Helm Charts

Deploy an ingress controller using Helm through Flux:

```yaml
# clusters/charmed/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/sources/ingress-nginx.yaml
  - ../../../infrastructure/controllers/ingress-nginx.yaml
```

```yaml
# infrastructure/sources/ingress-nginx.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes.github.io/ingress-nginx
```

```yaml
# infrastructure/controllers/ingress-nginx.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
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
  targetNamespace: ingress-nginx
  install:
    createNamespace: true
  values:
    controller:
      # Configuration tuned for Charmed Kubernetes
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
      metrics:
        enabled: true
      admissionWebhooks:
        enabled: true
```

## Integrating with Juju Operations

You can use Juju actions alongside Flux CD for operational tasks that span both the infrastructure and application layers:

```bash
# Scale the worker nodes with Juju
juju add-unit kubernetes-worker -n 1

# Kubernetes can schedule reconciled workloads on new nodes
# Check that Flux is reconciling properly after scaling
flux get kustomizations

# Verify pods are distributed across all nodes
kubectl get pods -o wide -n web-apps
```

## Setting Up Multi-Cluster Management

If you manage multiple Charmed Kubernetes clusters, configure Flux for multi-cluster support by storing the remote cluster kubeconfig in a Secret and referencing it from the Kustomization:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: production-kubeconfig
  namespace: flux-system
type: Opaque
stringData:
  value.yaml: |
    apiVersion: v1
    kind: Config
    # kubeconfig for the remote Charmed Kubernetes cluster
```

```yaml
# clusters/charmed/apps/remote-cluster.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  kubeConfig:
    secretRef:
      name: production-kubeconfig
  patches:
    - patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: not-important
        spec:
          replicas: 5
      target:
        kind: Deployment
        labelSelector: "managed-by=flux"
```

## Monitoring Flux on Charmed Kubernetes

Deploy monitoring to observe Flux operations:

Update the infrastructure Kustomize file so Flux also applies the monitoring repository and release:

```yaml
# clusters/charmed/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/sources/ingress-nginx.yaml
  - ../../../infrastructure/controllers/ingress-nginx.yaml
  - ../../../infrastructure/sources/prometheus.yaml
  - ../../../infrastructure/controllers/monitoring.yaml
```

```yaml
# infrastructure/sources/prometheus.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 24h
  url: https://prometheus-community.github.io/helm-charts
```

```yaml
# infrastructure/controllers/monitoring.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: ">=55.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  targetNamespace: monitoring
  install:
    createNamespace: true
  values:
    prometheus:
      prometheusSpec:
        # Scrape Flux metrics
        additionalScrapeConfigs:
          - job_name: flux-system
            metrics_path: /metrics
            static_configs:
              - targets:
                  - source-controller.flux-system:8080
                  - kustomize-controller.flux-system:8080
                  - helm-controller.flux-system:8080
                  - notification-controller.flux-system:8080
```

## Troubleshooting

Common debugging commands:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller

# Force Flux reconciliation
flux reconcile kustomization flux-system --with-source

# Check Juju-level issues
juju debug-log --replay --include kubernetes-control-plane

# Verify network connectivity
kubectl run test-dns --image=busybox:1.36 --rm -it --restart=Never -- nslookup kubernetes.default

# Check Flux events
flux events --for Kustomization/hello-charmed
```

## Conclusion

You now have Flux CD running on Canonical's Charmed Kubernetes. This setup combines Juju's infrastructure management capabilities with Flux's GitOps workflow, giving you a powerful platform where infrastructure changes are managed by Juju operators and application deployments flow through Git. Every commit to your repository is automatically reconciled by Flux, keeping your Charmed Kubernetes cluster in sync with your desired state.
