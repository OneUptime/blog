# How to Set Up Flux CD on Civo Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Civo, k3s, Kubernetes, GitOps, Marketplace, Cloud

Description: A practical guide to bootstrapping Flux CD on Civo Kubernetes with K3s, marketplace apps, and GitOps workflows.

---

## Introduction

Civo is a cloud-native hosting provider that uses K3s as the Kubernetes distribution for its managed service. Civo clusters launch in under 90 seconds and come with a marketplace of pre-configured applications. This guide shows you how to set up Flux CD on Civo Kubernetes, leverage marketplace apps, and build a complete GitOps pipeline.

## Prerequisites

- A Civo account with API access
- Civo CLI installed and configured (`civo`)
- `kubectl` installed
- Flux CLI installed (`flux` version 2.x)
- A GitHub account and personal access token

## Step 1: Create a Civo Kubernetes Cluster

```bash
# List available cluster sizes
civo kubernetes size list

# List available regions
civo region list

# Create a Kubernetes cluster
# Civo uses K3s, which launches very quickly
civo kubernetes create flux-cluster \
  --size g4s.kube.medium \
  --nodes 3 \
  --region NYC1 \
  --remove-applications Traefik-v2-nodeport \
  --wait

# Save kubeconfig
civo kubernetes config flux-cluster --save

# Merge into default kubeconfig
export KUBECONFIG=~/.kube/config

# Verify cluster access
kubectl get nodes
```

The `--remove-applications Traefik-v2-nodeport` flag removes the default Traefik installation since we will manage ingress through Flux.

## Step 2: Understanding Civo K3s Differences

Civo clusters run K3s, which has some differences from standard Kubernetes.

| Feature | K3s on Civo | Impact on Flux |
|---|---|---|
| Container runtime | containerd | No impact, fully compatible |
| Ingress | Traefik by default | Remove default, install via Flux |
| Storage | Civo Volumes (CSI) | Use `civo-volume` storage class |
| Load Balancer | Civo LB | Automatic provisioning |
| Networking | Flannel | No impact |

## Step 3: Bootstrap Flux CD

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Run pre-flight checks
flux check --pre

# Bootstrap Flux on the Civo cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/civo-cluster \
  --personal
```

Verify the bootstrap.

```bash
# Check Flux components
flux check

# View Flux system pods
kubectl get pods -n flux-system

# Verify Git source
flux get sources git
```

## Step 4: Install Marketplace Apps via Flux

Civo has a marketplace of pre-configured apps. Instead of installing them through the Civo dashboard, manage them through Flux for consistency.

### Install NGINX Ingress Controller

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
        annotations:
          # Civo automatically provisions a load balancer
          kubernetes.civo.com/loadbalancer-algorithm: "round_robin"
      # K3s-compatible settings
      admissionWebhooks:
        enabled: true
```

### Install Cert-Manager

```yaml
# infrastructure/cert-manager/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.jetstack.io
---
# infrastructure/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cert-manager
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  targetNamespace: cert-manager
  install:
    createNamespace: true
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    installCRDs: true
---
# infrastructure/cert-manager/cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

## Step 5: Create Infrastructure Kustomization

```yaml
# clusters/civo-cluster/infrastructure.yaml
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

## Step 6: Deploy an Application

```yaml
# apps/blog/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: blog
---
# apps/blog/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog
  namespace: blog
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blog
  template:
    metadata:
      labels:
        app: blog
    spec:
      containers:
        - name: blog
          image: ghcr.io/my-org/blog:1.0.0 # {"$imagepolicy": "flux-system:blog"}
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
---
# apps/blog/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: blog
  namespace: blog
spec:
  selector:
    app: blog
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
# apps/blog/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: blog
  namespace: blog
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - blog.example.com
      secretName: blog-tls
  rules:
    - host: blog.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: blog
                port:
                  number: 80
```

Create the Flux Kustomization for the app.

```yaml
# clusters/civo-cluster/blog-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: blog-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/blog
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  wait: true
```

## Step 7: Configure Civo Volume Storage

```yaml
# infrastructure/storage/pvc-example.yaml
# Civo provides block storage through the civo-volume storage class
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: blog
spec:
  # Use the Civo volume storage class
  storageClassName: civo-volume
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Step 8: Set Up Image Automation

```yaml
# infrastructure/image-automation/image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: blog
  namespace: flux-system
spec:
  image: ghcr.io/my-org/blog
  interval: 5m
  secretRef:
    name: ghcr-credentials
---
# infrastructure/image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: blog
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: blog
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
      messageTemplate: "chore: update {{.AutomationObject}} images"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Step 9: Set Up Notifications

```yaml
# infrastructure/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: discord
  namespace: flux-system
spec:
  type: discord
  secretRef:
    name: discord-webhook-url
---
# infrastructure/notifications/alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: civo-alerts
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

## Step 10: Verify and Monitor

```bash
# Check all Flux resources
flux get all

# Verify infrastructure components
kubectl get helmrelease -A
kubectl get pods -n ingress-nginx
kubectl get pods -n cert-manager

# Check the application
kubectl get pods -n blog
kubectl get ingress -n blog

# View the Civo Load Balancer
civo loadbalancer list

# Check Civo cluster status
civo kubernetes show flux-cluster

# View Flux logs
flux logs --since=30m

# Force reconciliation if needed
flux reconcile kustomization blog-app --with-source
```

## Troubleshooting

### Cluster Creation Takes Too Long

Civo clusters typically launch in under 90 seconds. If it takes longer, check the Civo status page.

```bash
# Check cluster status
civo kubernetes show flux-cluster

# View cluster events
civo kubernetes show flux-cluster -o json | jq '.status'
```

### Ingress Not Working

```bash
# Verify NGINX ingress controller is running
kubectl get pods -n ingress-nginx

# Check the load balancer IP
kubectl get svc -n ingress-nginx

# Verify DNS resolution
dig blog.example.com

# Check ingress resource
kubectl describe ingress -n blog blog
```

### Volume Provisioning Issues

```bash
# Check PVC status
kubectl get pvc -n blog

# Verify the Civo volume CSI driver
kubectl get pods -n kube-system | grep civo

# Check Civo volumes
civo volume list
```

## Summary

You have set up Flux CD on Civo Kubernetes, taking advantage of K3s fast cluster provisioning. The setup includes NGINX ingress with Civo Load Balancer, cert-manager for TLS certificates, image automation with GHCR, and deployment notifications. Civo's speed and simplicity combined with Flux CD's GitOps capabilities provide a developer-friendly platform for deploying and managing applications.
