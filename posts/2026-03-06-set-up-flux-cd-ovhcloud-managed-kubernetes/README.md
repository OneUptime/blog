# How to Set Up Flux CD on OVHcloud Managed Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, ovhcloud, ovh, kubernetes, gitops, harbor, container registry

Description: A practical guide to bootstrapping Flux CD on OVHcloud Managed Kubernetes with Harbor registry integration and GitOps workflows.

---

## Introduction

OVHcloud Managed Kubernetes provides a CNCF-certified Kubernetes service with European data sovereignty and competitive pricing. This guide covers how to set up Flux CD on OVHcloud Kubernetes, integrate Harbor as a container registry, and build a GitOps pipeline for continuous deployment.

## Prerequisites

- An OVHcloud account with a Public Cloud project
- OVHcloud CLI or API access configured
- `kubectl` installed
- Flux CLI installed (`flux` version 2.x)
- A GitHub account and personal access token
- Helm installed (for initial Harbor setup)

## Step 1: Create an OVHcloud Managed Kubernetes Cluster

You can create the cluster through the OVHcloud Control Panel or using the API.

```bash
# Using the OVH API via curl
# First, get your service name (Public Cloud project ID)
export OVH_PROJECT_ID="your-project-id"
export OVH_REGION="GRA7"

# Create a Kubernetes cluster via the OVHcloud Control Panel
# Navigate to: Public Cloud > Managed Kubernetes > Create a cluster
# Select:
#   - Region: GRA7 (Gravelines, France)
#   - Version: 1.29
#   - Node pool: 3x b2-7 instances

# After creation, download the kubeconfig from the Control Panel
# Or use the OVH API:
# GET /cloud/project/{serviceName}/kube/{kubeId}/kubeconfig

# Save the kubeconfig
export KUBECONFIG=~/.kube/ovh-config

# Verify cluster access
kubectl get nodes
kubectl cluster-info
```

## Step 2: Set Up Harbor Container Registry

OVHcloud does not have a native container registry, so deploy Harbor on the cluster or use the OVHcloud managed Harbor offering.

### Option A: Use OVHcloud Managed Private Registry

```bash
# Create a managed private registry from the OVHcloud Control Panel
# Navigate to: Public Cloud > Managed Private Registry > Create
# This provisions a Harbor instance managed by OVHcloud

# Once created, get the registry URL and credentials from the Control Panel
export REGISTRY_URL="xxxxxxxx.c1.gra9.container-registry.ovh.net"
export REGISTRY_USER="admin"
export REGISTRY_PASS="your-registry-password"

# Log in to the registry
docker login ${REGISTRY_URL} \
  --username ${REGISTRY_USER} \
  --password ${REGISTRY_PASS}
```

### Option B: Deploy Harbor via Flux

```yaml
# infrastructure/harbor/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: harbor
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.goharbor.io
---
# infrastructure/harbor/helmrelease.yaml
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
    externalURL: https://harbor.example.com
    # Use OVHcloud Block Storage for persistence
    persistence:
      persistentVolumeClaim:
        registry:
          storageClass: csi-cinder-high-speed
          size: 100Gi
        database:
          storageClass: csi-cinder-high-speed
          size: 10Gi
        redis:
          storageClass: csi-cinder-high-speed
          size: 5Gi
    harborAdminPassword: "change-this-password"
```

## Step 3: Create Registry Credentials

```bash
# Create the flux-system namespace if not present
kubectl create namespace flux-system 2>/dev/null || true

# Create a docker registry secret for Harbor
kubectl create secret docker-registry harbor-credentials \
  --namespace=flux-system \
  --docker-server=${REGISTRY_URL} \
  --docker-username=${REGISTRY_USER} \
  --docker-password=${REGISTRY_PASS}

# Also create in application namespaces as needed
kubectl create namespace my-app 2>/dev/null || true
kubectl create secret docker-registry harbor-credentials \
  --namespace=my-app \
  --docker-server=${REGISTRY_URL} \
  --docker-username=${REGISTRY_USER} \
  --docker-password=${REGISTRY_PASS}
```

## Step 4: Bootstrap Flux CD

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Run pre-flight checks
flux check --pre

# Bootstrap Flux on the OVHcloud cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/ovh-cluster \
  --personal
```

Verify the bootstrap.

```bash
# Check Flux components
flux check

# View Flux pods
kubectl get pods -n flux-system

# Verify Git source connection
flux get sources git
```

## Step 5: Configure OVHcloud Storage Classes

OVHcloud provides OpenStack Cinder-based storage.

```yaml
# infrastructure/storage/storage-classes.yaml
# High-speed SSD storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-cinder-high-speed-retain
provisioner: cinder.csi.openstack.org
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: high-speed
---
# Classic HDD storage class for backups and archives
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-cinder-classic-retain
provisioner: cinder.csi.openstack.org
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: classic
```

## Step 6: Deploy an Application

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
          # Image from Harbor registry
          image: harbor.example.com/library/web-app:1.0.0 # {"$imagepolicy": "flux-system:web-app"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
      imagePullSecrets:
        - name: harbor-credentials
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
      targetPort: 8080
  type: ClusterIP
---
# apps/web-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: web-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: web-app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

Create the Flux Kustomization.

```yaml
# clusters/ovh-cluster/web-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/web-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  wait: true
```

## Step 7: Install NGINX Ingress Controller

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
        type: LoadBalancer
        # OVHcloud uses OpenStack Octavia for load balancers
        annotations:
          service.beta.kubernetes.io/ovh-loadbalancer-proxy-protocol: "v2"
      config:
        use-proxy-protocol: "true"
```

## Step 8: Set Up Image Automation with Harbor

```yaml
# infrastructure/image-automation/image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: web-app
  namespace: flux-system
spec:
  image: harbor.example.com/library/web-app
  interval: 5m
  secretRef:
    name: harbor-credentials
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

## Step 9: Create Infrastructure Kustomization

```yaml
# clusters/ovh-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  wait: true
```

## Step 10: Verify and Monitor

```bash
# Check all Flux resources
flux get all

# Verify kustomizations
flux get kustomizations

# Check Helm releases
flux get helmreleases -A

# Verify the application
kubectl get pods -n web-app
kubectl get ingress -n web-app

# Check the OVHcloud Load Balancer
kubectl get svc -n ingress-nginx

# View Flux logs
flux logs --since=30m

# Check image automation
flux get image repository
flux get image policy
```

## Troubleshooting

### Load Balancer Not Provisioning

OVHcloud uses OpenStack Octavia for load balancers.

```bash
# Check service events
kubectl describe svc -n ingress-nginx ingress-nginx-controller

# Verify your OVHcloud quota for load balancers
# Check in OVHcloud Control Panel > Public Cloud > Quota
```

### Storage Provisioning Failures

```bash
# Check PVC status
kubectl get pvc -A

# Verify the Cinder CSI driver
kubectl get pods -n kube-system | grep cinder

# Check Cinder volume quota
# OVHcloud Control Panel > Public Cloud > Quota
```

### Harbor Image Pull Errors

```bash
# Verify harbor credentials
kubectl get secret harbor-credentials -n web-app -o yaml

# Test registry access
docker pull harbor.example.com/library/web-app:latest

# Check Harbor is accessible
curl -k https://harbor.example.com/api/v2.0/ping
```

## Summary

You have set up Flux CD on OVHcloud Managed Kubernetes with Harbor container registry integration. The setup includes NGINX ingress backed by OpenStack Octavia load balancers, Cinder-based persistent storage, image automation for continuous deployment, and a complete GitOps workflow. OVHcloud provides European data sovereignty, which is important for organizations subject to GDPR and other EU data regulations.
