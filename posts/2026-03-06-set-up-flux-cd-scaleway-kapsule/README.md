# How to Set Up Flux CD on Scaleway Kapsule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Scaleway, Kapsule, Kubernetes, GitOps, Container Registry, Cloud

Description: A step-by-step guide to bootstrapping Flux CD on Scaleway Kapsule with Scaleway Container Registry integration and GitOps workflows.

---

## Introduction

Scaleway Kapsule is a managed Kubernetes service from the European cloud provider Scaleway. It offers CNCF-certified Kubernetes with a native container registry, making it a complete platform for GitOps workflows. This guide shows you how to set up Flux CD on Kapsule, integrate with Scaleway Container Registry (SCR), and deploy applications using GitOps.

## Prerequisites

- A Scaleway account with an API key
- Scaleway CLI installed and configured (`scw`)
- `kubectl` installed
- Flux CLI installed (`flux` version 2.x)
- A GitHub account and personal access token

## Step 1: Create a Scaleway Kapsule Cluster

```bash
# Create a Kubernetes cluster on Scaleway Kapsule
scw k8s cluster create \
  name=flux-cluster \
  version=1.29.1 \
  cni=cilium \
  region=fr-par \
  pools.0.name=default \
  pools.0.node-type=DEV1-M \
  pools.0.size=3 \
  pools.0.min-size=3 \
  pools.0.max-size=5 \
  pools.0.autohealing=true \
  pools.0.autoscaling=true

# Get the cluster ID
export CLUSTER_ID=$(scw k8s cluster list region=fr-par \
  name=flux-cluster -o json | jq -r '.[0].id')

# Wait for the cluster to be ready
scw k8s cluster wait ${CLUSTER_ID} region=fr-par

# Download kubeconfig
scw k8s kubeconfig install ${CLUSTER_ID} region=fr-par

# Verify cluster access
kubectl get nodes
kubectl cluster-info
```

## Step 2: Create a Scaleway Container Registry

```bash
# Create a container registry namespace
scw registry namespace create \
  name=my-registry \
  region=fr-par \
  is-public=false

# Get the registry endpoint
export REGISTRY_ENDPOINT=$(scw registry namespace list region=fr-par \
  name=my-registry -o json | jq -r '.[0].endpoint')

# Log in to the registry using Scaleway credentials
docker login ${REGISTRY_ENDPOINT} \
  --username nologin \
  --password $(scw iam api-key list -o json | jq -r '.[0].secret_key')
```

## Step 3: Create Registry Credentials in Kubernetes

```bash
# Get your Scaleway secret key for registry authentication
export SCW_SECRET_KEY=$(scw iam api-key list -o json | jq -r '.[0].secret_key')

# Create the flux-system namespace if not present
kubectl create namespace flux-system 2>/dev/null || true

# Create a docker registry secret for SCR
kubectl create secret docker-registry scr-credentials \
  --namespace=flux-system \
  --docker-server=${REGISTRY_ENDPOINT} \
  --docker-username=nologin \
  --docker-password=${SCW_SECRET_KEY}
```

## Step 4: Bootstrap Flux CD

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Run pre-flight checks
flux check --pre

# Bootstrap Flux on the Kapsule cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/scaleway-cluster \
  --personal
```

Verify the bootstrap.

```bash
# Check Flux components
flux check

# View Flux system pods
kubectl get pods -n flux-system

# Confirm Git source connection
flux get sources git
```

## Step 5: Configure Scaleway Storage Classes

Scaleway provides block storage through its CSI driver.

```yaml
# infrastructure/storage/storage-classes.yaml
# Scaleway SSD Block Storage with retain policy
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: scw-bssd-retain
provisioner: csi.scaleway.com
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: b_ssd
```

## Step 6: Install NGINX Ingress Controller

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
          # Scaleway Load Balancer annotations
          service.beta.kubernetes.io/scw-loadbalancer-type: "LB-S"
          service.beta.kubernetes.io/scw-loadbalancer-protocol-http: "true"
          service.beta.kubernetes.io/scw-loadbalancer-proxy-protocol-v2: "true"
          service.beta.kubernetes.io/scw-loadbalancer-health-check-type: "http"
          service.beta.kubernetes.io/scw-loadbalancer-health-check-http-uri: "/healthz"
          # Zone for the load balancer
          service.beta.kubernetes.io/scw-loadbalancer-zone: "fr-par-1"
      config:
        use-proxy-protocol: "true"
```

## Step 7: Create Infrastructure Kustomization

```yaml
# clusters/scaleway-cluster/infrastructure.yaml
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

## Step 8: Deploy an Application

```yaml
# apps/api-service/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: api-service
---
# apps/api-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: api-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
        - name: api
          # Image from Scaleway Container Registry
          image: rg.fr-par.scw.cloud/my-registry/api-service:1.0.0 # {"$imagepolicy": "flux-system:api-service"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: database-url
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
        - name: scr-credentials
---
# apps/api-service/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: api-service
spec:
  selector:
    app: api-service
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
# apps/api-service/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-service
  namespace: api-service
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

Create the Flux Kustomization.

```yaml
# clusters/scaleway-cluster/api-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-service
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/api-service
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  wait: true
```

## Step 9: Set Up Image Automation with SCR

```yaml
# infrastructure/image-automation/image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: api-service
  namespace: flux-system
spec:
  image: rg.fr-par.scw.cloud/my-registry/api-service
  interval: 5m
  secretRef:
    name: scr-credentials
---
# infrastructure/image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: api-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-service
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
      messageTemplate: "chore: update {{.AutomationObject}} to {{range .Changed.Changes}}{{.NewValue}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Step 10: Install Cert-Manager and Set Up Notifications

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

Set up deployment notifications.

```yaml
# infrastructure/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: scaleway-deployments
  secretRef:
    name: slack-webhook-url
---
# infrastructure/notifications/alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: scaleway-alerts
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
```

## Verify the Complete Setup

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

# Check the application
kubectl get pods -n api-service
kubectl get ingress -n api-service

# Check the Scaleway Load Balancer
kubectl get svc -n ingress-nginx
scw lb lb list zone=fr-par-1

# View Flux logs
flux logs --since=30m
```

## Troubleshooting

### Load Balancer Not Creating

```bash
# Check service events
kubectl describe svc -n ingress-nginx ingress-nginx-controller

# Verify Scaleway Load Balancer quota
scw lb lb list zone=fr-par-1

# Check the CCM (Cloud Controller Manager) logs
kubectl logs -n kube-system -l app=scaleway-cloud-controller-manager --tail=50
```

### SCR Image Pull Errors

```bash
# Verify registry credentials
kubectl get secret scr-credentials -n flux-system -o yaml

# Test registry access
docker pull rg.fr-par.scw.cloud/my-registry/api-service:latest

# Check the registry namespace status
scw registry namespace list region=fr-par
```

### Block Storage Issues

```bash
# Check PVC status
kubectl get pvc -A

# Verify the Scaleway CSI driver
kubectl get pods -n kube-system | grep csi

# List Scaleway volumes
scw instance volume list zone=fr-par-1
```

### Autoscaler Not Working

```bash
# Check the cluster autoscaler status
kubectl get pods -n kube-system | grep autoscaler

# View autoscaler events
kubectl get events -n kube-system --field-selector source=cluster-autoscaler

# Verify pool autoscaling is enabled
scw k8s pool list cluster-id=${CLUSTER_ID} region=fr-par
```

## Summary

You have set up Flux CD on Scaleway Kapsule with full integration to Scaleway Container Registry. The setup includes NGINX ingress backed by Scaleway Load Balancer, cert-manager for automatic TLS certificates, image automation for continuous deployment from SCR, and Slack notifications for deployment events. Scaleway provides European data hosting with competitive pricing, and combined with Flux CD, you get a production-ready GitOps platform with automatic scaling and container registry integration.
