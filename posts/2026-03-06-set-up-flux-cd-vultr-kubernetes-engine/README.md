# How to Set Up Flux CD on Vultr Kubernetes Engine

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, vultr, vke, kubernetes, gitops, container registry, cloud

Description: A step-by-step guide to bootstrapping Flux CD on Vultr Kubernetes Engine with Vultr Container Registry integration.

---

## Introduction

Vultr Kubernetes Engine (VKE) provides a managed Kubernetes service with global data center presence and competitive pricing. Combined with Vultr Container Registry (VCR), you can build a complete GitOps pipeline using Flux CD. This guide walks you through cluster creation, Flux bootstrap, registry integration, and application deployment.

## Prerequisites

- A Vultr account with API access enabled
- Vultr CLI installed and configured (`vultr-cli`)
- `kubectl` installed
- Flux CLI installed (`flux` version 2.x)
- A GitHub account and personal access token

## Step 1: Create a VKE Cluster

```bash
# List available Kubernetes versions
vultr-cli kubernetes versions

# List available regions
vultr-cli regions list

# Create a Kubernetes cluster
vultr-cli kubernetes create \
  --label "flux-cluster" \
  --region ewr \
  --version "v1.29.2+1" \
  --node-pools "quantity:3,plan:vc2-2c-4gb,label:default-pool"

# Get the cluster ID
export CLUSTER_ID=$(vultr-cli kubernetes list | grep flux-cluster | awk '{print $1}')

# Download kubeconfig
vultr-cli kubernetes config ${CLUSTER_ID} > ~/.kube/vultr-config

# Set kubeconfig
export KUBECONFIG=~/.kube/vultr-config

# Verify cluster access
kubectl get nodes
```

## Step 2: Create a Vultr Container Registry

```bash
# Create a container registry
vultr-cli container-registry create \
  --name my-registry \
  --region ewr \
  --plan start_up \
  --public false

# Get registry credentials
export VCR_ID=$(vultr-cli container-registry list | grep my-registry | awk '{print $1}')
vultr-cli container-registry docker-credentials ${VCR_ID} --expiry-seconds 0

# Log in to the registry using Docker
docker login https://ewr.vultrcr.com/my-registry \
  --username <vcr-username> \
  --password <vcr-password>
```

## Step 3: Create Registry Credentials in Kubernetes

```bash
# Create the flux-system namespace if it does not exist
kubectl create namespace flux-system 2>/dev/null || true

# Create a docker registry secret for VCR
kubectl create secret docker-registry vcr-credentials \
  --namespace=flux-system \
  --docker-server=ewr.vultrcr.com/my-registry \
  --docker-username=<vcr-username> \
  --docker-password=<vcr-password>
```

## Step 4: Bootstrap Flux CD

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Run pre-flight checks
flux check --pre

# Bootstrap Flux on the VKE cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/vultr-cluster \
  --personal
```

Verify the bootstrap.

```bash
# Check Flux components
flux check

# View all Flux system pods
kubectl get pods -n flux-system

# Confirm Git source connection
flux get sources git
```

## Step 5: Deploy Infrastructure Components

Create a Flux Kustomization for infrastructure.

```yaml
# clusters/vultr-cluster/infrastructure.yaml
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

## Step 6: Install NGINX Ingress with Vultr Load Balancer

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
          # Vultr Load Balancer annotations
          service.beta.kubernetes.io/vultr-loadbalancer-protocol: "http"
          # Enable proxy protocol for real client IPs
          service.beta.kubernetes.io/vultr-loadbalancer-proxy-protocol: "true"
          # Health check configuration
          service.beta.kubernetes.io/vultr-loadbalancer-health-check-protocol: "http"
          service.beta.kubernetes.io/vultr-loadbalancer-health-check-path: "/healthz"
          service.beta.kubernetes.io/vultr-loadbalancer-health-check-port: "80"
      config:
        use-proxy-protocol: "true"
```

## Step 7: Deploy an Application

```yaml
# apps/my-app/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
---
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          # Image from Vultr Container Registry
          image: ewr.vultrcr.com/my-registry/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
      imagePullSecrets:
        - name: vcr-credentials
---
# apps/my-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
# apps/my-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: my-app
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
                name: my-app
                port:
                  number: 80
```

Create the Flux Kustomization for the application.

```yaml
# clusters/vultr-cluster/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  wait: true
```

## Step 8: Set Up Image Automation with VCR

Configure Flux to watch Vultr Container Registry for new images.

```yaml
# infrastructure/image-automation/image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ewr.vultrcr.com/my-registry/my-app
  interval: 5m
  secretRef:
    name: vcr-credentials
---
# infrastructure/image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
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

## Step 9: Configure Persistent Storage

VKE uses Vultr Block Storage through the CSI driver.

```yaml
# infrastructure/storage/storage-class.yaml
# Vultr Block Storage with retain policy
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vultr-block-storage-retain
provisioner: block.csi.vultr.com
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Step 10: Set Up Notifications and Monitoring

```yaml
# infrastructure/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: vke-deployments
  secretRef:
    name: slack-webhook-url
---
# infrastructure/notifications/alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: vultr-alerts
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
  inclusionList:
    - ".*succeeded.*"
    - ".*failed.*"
    - ".*error.*"
```

## Verify the Complete Setup

```bash
# Check all Flux resources
flux get all

# Verify kustomizations
flux get kustomizations

# Check image automation
flux get image repository
flux get image policy

# Verify the application
kubectl get pods -n my-app
kubectl get ingress -n my-app

# Check the Vultr Load Balancer
kubectl get svc -n ingress-nginx

# View Flux logs
flux logs --since=30m
```

## Troubleshooting

### VCR Authentication Failures

```bash
# Verify the registry secret
kubectl get secret vcr-credentials -n flux-system -o yaml

# Test registry access
docker pull ewr.vultrcr.com/my-registry/my-app:latest

# Regenerate credentials if expired
vultr-cli container-registry docker-credentials ${VCR_ID} --expiry-seconds 0
```

### Load Balancer Pending

```bash
# Check service events
kubectl describe svc -n ingress-nginx ingress-nginx-controller

# Verify Vultr Load Balancer status
vultr-cli load-balancer list
```

### Pods Not Starting

```bash
# Check pod events
kubectl describe pod -n my-app -l app=my-app

# Verify image pull secrets are set
kubectl get deployment -n my-app my-app \
  -o jsonpath='{.spec.template.spec.imagePullSecrets}'

# Check node resources
kubectl top nodes
```

## Summary

You have set up Flux CD on Vultr Kubernetes Engine with Vultr Container Registry integration. The pipeline includes GitOps-driven application deployment, automatic image updates from VCR, NGINX ingress backed by Vultr Load Balancer, and Slack notifications for deployment events. This provides a complete, cost-effective GitOps workflow on Vultr infrastructure.
