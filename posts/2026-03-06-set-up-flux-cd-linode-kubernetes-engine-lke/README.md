# How to Set Up Flux CD on Linode Kubernetes Engine (LKE)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Linode, LKE, Akamai, Kubernetes, GitOps, Container Registry

Description: A practical guide to bootstrapping Flux CD on Linode Kubernetes Engine with container registry integration and GitOps workflows.

---

## Introduction

Linode Kubernetes Engine (LKE), now part of Akamai Connected Cloud, provides a managed Kubernetes service with competitive pricing and straightforward setup. This guide covers how to bootstrap Flux CD on LKE, integrate with container registries, and deploy applications using GitOps principles.

## Prerequisites

- A Linode/Akamai Cloud account
- Linode CLI installed and configured (`linode-cli`)
- `kubectl` installed
- Flux CLI installed (`flux` version 2.x)
- A GitHub account and personal access token

## Step 1: Create an LKE Cluster

```bash
# Create a Kubernetes cluster on LKE
linode-cli lke cluster-create \
  --label flux-cluster \
  --region us-east \
  --k8s_version 1.29 \
  --node_pools '[{
    "type": "g6-standard-2",
    "count": 3
  }]'

# Get the cluster ID from the output
export CLUSTER_ID=$(linode-cli lke clusters-list \
  --label flux-cluster --json | jq -r '.[0].id')

# Download kubeconfig
linode-cli lke kubeconfig-view ${CLUSTER_ID} \
  --json | jq -r '.[0].kubeconfig' | base64 -d > ~/.kube/lke-config

# Set kubeconfig
export KUBECONFIG=~/.kube/lke-config

# Verify cluster access
kubectl get nodes
```

## Step 2: Set Up a Container Registry

Linode does not have a native container registry, so you can use Docker Hub, GitHub Container Registry (GHCR), or a self-hosted registry. This guide uses GHCR.

```bash
# Create a Kubernetes secret for GHCR authentication
kubectl create namespace flux-system 2>/dev/null || true

kubectl create secret docker-registry ghcr-credentials \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=${GITHUB_USER} \
  --docker-password=${GITHUB_TOKEN}
```

Alternatively, deploy Harbor as a self-hosted registry on LKE.

```yaml
# infrastructure/registry/harbor-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: harbor
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.goharbor.io
---
# infrastructure/registry/harbor-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: harbor
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: harbor
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: harbor
  targetNamespace: harbor
  install:
    createNamespace: true
  values:
    expose:
      type: loadBalancer
      tls:
        enabled: true
        certSource: auto
    # Use Linode Block Storage for persistence
    persistence:
      persistentVolumeClaim:
        registry:
          storageClass: linode-block-storage-retain
          size: 50Gi
        database:
          storageClass: linode-block-storage-retain
          size: 10Gi
```

## Step 3: Bootstrap Flux CD

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Run pre-flight checks
flux check --pre

# Bootstrap Flux on LKE
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/lke-cluster \
  --personal
```

Verify the bootstrap completed successfully.

```bash
# Check Flux components
flux check

# Verify all controllers are running
kubectl get pods -n flux-system

# Check the Git source connection
flux get sources git
```

## Step 4: Configure Storage Class for LKE

LKE provides Linode Block Storage as the default storage class. Ensure your Flux-managed applications use it correctly.

```yaml
# infrastructure/storage/storage-class.yaml
# Linode Block Storage with retain policy for critical data
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: linode-block-storage-retain
provisioner: linodebs.csi.linode.com
reclaimPolicy: Retain
allowVolumeExpansion: true
parameters:
  # Linode Block Storage does not require additional parameters
  type: ext4
```

## Step 5: Deploy an Application

Create application manifests managed by Flux.

```yaml
# apps/web-app/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: web-app
---
# apps/web-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: app
          image: ghcr.io/my-org/web-app:1.0.0 # {"$imagepolicy": "flux-system:web-app"}
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          env:
            - name: NODE_ENV
              value: production
      imagePullSecrets:
        - name: ghcr-credentials
---
# apps/web-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: web-app
spec:
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

Create the Flux Kustomization.

```yaml
# clusters/lke-cluster/web-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/web-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  wait: true
```

## Step 6: Install NGINX Ingress with Linode NodeBalancer

```yaml
# infrastructure/ingress/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes.github.io/ingress-nginx
---
# infrastructure/ingress/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  targetNamespace: ingress-nginx
  install:
    createNamespace: true
  values:
    controller:
      service:
        annotations:
          # Linode NodeBalancer configuration
          service.beta.kubernetes.io/linode-loadbalancer-default-protocol: "http"
          service.beta.kubernetes.io/linode-loadbalancer-port-443: '{"protocol": "https", "tls-secret-name": "tls-secret"}'
          service.beta.kubernetes.io/linode-loadbalancer-check-type: "http"
          service.beta.kubernetes.io/linode-loadbalancer-check-path: "/healthz"
          service.beta.kubernetes.io/linode-loadbalancer-throttle: "5"
```

## Step 7: Set Up Image Automation

```yaml
# infrastructure/image-automation/image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: web-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/web-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
# infrastructure/image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: web-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: web-app
  policy:
    semver:
      range: ">=1.0.0"
---
# infrastructure/image-automation/image-update.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@example.com
      messageTemplate: "chore: update image to {{range .Changed.Changes}}{{.NewValue}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Step 8: Configure Monitoring with Prometheus

Deploy a lightweight monitoring stack on LKE.

```yaml
# infrastructure/monitoring/kube-prometheus-stack.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "56.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  targetNamespace: monitoring
  install:
    createNamespace: true
  values:
    # Scrape Flux CD metrics
    prometheus:
      additionalServiceMonitors:
        - name: flux-system
          namespaceSelector:
            matchNames:
              - flux-system
          selector:
            matchLabels:
              app.kubernetes.io/part-of: flux
          endpoints:
            - port: http-prom
              interval: 30s
    # Use Linode Block Storage for persistence
    prometheus:
      prometheusSpec:
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: linode-block-storage-retain
              resources:
                requests:
                  storage: 20Gi
    grafana:
      persistence:
        enabled: true
        storageClassName: linode-block-storage-retain
        size: 5Gi
```

## Step 9: Set Up Flux Notifications

```yaml
# infrastructure/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook
---
# infrastructure/notifications/alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: lke-alerts
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
    - kind: GitRepository
      name: "*"
```

## Step 10: Verify the Complete Setup

```bash
# Check all Flux resources
flux get all

# Verify kustomizations are reconciled
flux get kustomizations

# Check Helm releases
flux get helmreleases -A

# Verify image automation
flux get image repository
flux get image policy

# Check application pods
kubectl get pods -n web-app
kubectl get svc -n web-app

# Check the NodeBalancer
kubectl get svc -n ingress-nginx
linode-cli nodebalancers list
```

## Troubleshooting

### Block Storage Provisioning Failures

```bash
# Check PVC status
kubectl get pvc -A

# View CSI driver logs
kubectl logs -n kube-system -l app=csi-linode-controller --tail=50
```

### NodeBalancer Not Responding

```bash
# Check the load balancer service
kubectl describe svc -n ingress-nginx ingress-nginx-controller

# View NodeBalancer details
linode-cli nodebalancers list --json | jq '.'
```

### Flux Git Authentication Issues

```bash
# Verify the Git source status
flux get sources git

# Check Flux controller logs
flux logs --kind=GitRepository --name=flux-system
```

## Summary

You have set up Flux CD on Linode Kubernetes Engine with GHCR integration, NGINX ingress backed by Linode NodeBalancers, image automation for continuous deployment, and Prometheus monitoring with Flux metrics collection. This gives you a production-ready GitOps workflow on LKE with full observability and automated deployments when new container images are published.
