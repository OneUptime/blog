# How to Set Up Flux CD on DigitalOcean Kubernetes (DOKS)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, DigitalOcean, DOKS, DOCR, Kubernetes, GitOps, Container Registry

Description: A step-by-step guide to bootstrapping Flux CD on DigitalOcean Kubernetes with DigitalOcean Container Registry integration.

---

## Introduction

DigitalOcean Kubernetes (DOKS) is a managed Kubernetes service that makes it straightforward to deploy containerized applications. Paired with DigitalOcean Container Registry (DOCR) and Flux CD, you get a complete GitOps pipeline running entirely on DigitalOcean infrastructure.

This guide walks you through creating a DOKS cluster, setting up DOCR, bootstrapping Flux CD, and deploying applications using GitOps.

## Prerequisites

- A DigitalOcean account with billing configured
- `doctl` CLI installed and authenticated
- `kubectl` installed
- Flux CLI installed (`flux` version 2.x)
- A GitHub account and personal access token

## Step 1: Create a DOKS Cluster

```bash
# Create a Kubernetes cluster on DigitalOcean
doctl kubernetes cluster create flux-cluster \
  --region nyc1 \
  --version 1.29.1-do.0 \
  --node-pool "name=default-pool;size=s-2vcpu-4gb;count=3" \
  --wait

# Save kubeconfig
doctl kubernetes cluster kubeconfig save flux-cluster

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

## Step 2: Create a DigitalOcean Container Registry

```bash
# Create a container registry (one per account)
doctl registry create my-registry \
  --subscription-tier basic \
  --region nyc1

# Log in to the registry
doctl registry login

# Integrate the registry with the DOKS cluster
# This creates image pull secrets automatically
doctl kubernetes cluster registry add flux-cluster
```

Verify the registry integration.

```bash
# Check that the registry secret exists in the cluster
kubectl get secrets -n kube-system | grep registry

# Verify the registry endpoint
doctl registry get
```

## Step 3: Bootstrap Flux CD

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Run pre-flight checks
flux check --pre

# Bootstrap Flux on the DOKS cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/doks-cluster \
  --personal
```

Verify the bootstrap.

```bash
# Check all Flux components are running
flux check

# View Flux pods
kubectl get pods -n flux-system

# Check the git repository connection
flux get sources git
```

## Step 4: Configure DOCR Authentication for Flux

Flux needs credentials to pull images from DOCR for image automation.

```bash
# Generate a read-only API token for DOCR
# Go to DigitalOcean API settings and create a token,
# or use doctl to generate registry credentials
doctl registry docker-config --read-write > /tmp/docr-config.json
```

Create a Kubernetes secret with the registry credentials.

```yaml
# infrastructure/docr/registry-secret.yaml
# This secret allows Flux image reflector to scan DOCR
apiVersion: v1
kind: Secret
metadata:
  name: docr-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  # Base64 encoded docker config JSON
  # Generate with: cat /tmp/docr-config.json | base64
  .dockerconfigjson: <base64-encoded-docker-config>
```

Alternatively, create the secret using kubectl.

```bash
# Create the secret directly from the docker config
kubectl create secret docker-registry docr-credentials \
  --namespace flux-system \
  --docker-server=registry.digitalocean.com \
  --docker-username=<do-api-token> \
  --docker-password=<do-api-token>
```

## Step 5: Deploy an Application with Flux

Create the application manifests in your Git repository.

```yaml
# apps/demo-app/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
---
# apps/demo-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: demo-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
        - name: app
          # Use an image from DOCR
          image: registry.digitalocean.com/my-registry/demo-app:1.0.0 # {"$imagepolicy": "flux-system:demo-app"}
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
---
# apps/demo-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-app
  namespace: demo-app
spec:
  selector:
    app: demo-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
# apps/demo-app/ingress.yaml
# Use DigitalOcean Load Balancer via ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: demo-app
  namespace: demo-app
  annotations:
    # DigitalOcean-specific load balancer annotations
    kubernetes.digitalocean.com/load-balancer-id: ""
spec:
  ingressClassName: nginx
  rules:
    - host: demo.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: demo-app
                port:
                  number: 80
```

Create the Flux Kustomization.

```yaml
# clusters/doks-cluster/demo-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: demo-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/demo-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  wait: true
```

## Step 6: Set Up Image Automation with DOCR

Configure Flux to automatically update deployments when new images are pushed to DOCR.

```yaml
# infrastructure/image-automation/image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: demo-app
  namespace: flux-system
spec:
  image: registry.digitalocean.com/my-registry/demo-app
  interval: 5m
  # Reference the DOCR credentials secret
  secretRef:
    name: docr-credentials
---
# infrastructure/image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: demo-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: demo-app
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

## Step 7: Install NGINX Ingress Controller via Flux

Deploy the NGINX ingress controller using a HelmRelease managed by Flux.

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
      interval: 1h
  targetNamespace: ingress-nginx
  install:
    createNamespace: true
  values:
    controller:
      # DigitalOcean-specific configuration
      service:
        annotations:
          # Use DigitalOcean Load Balancer
          service.beta.kubernetes.io/do-loadbalancer-name: "flux-ingress-lb"
          service.beta.kubernetes.io/do-loadbalancer-protocol: "http"
          service.beta.kubernetes.io/do-loadbalancer-size-slug: "lb-small"
          # Enable proxy protocol for real client IPs
          service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"
      config:
        use-proxy-protocol: "true"
```

## Step 8: Configure Flux Notifications

Set up alerts for deployment events.

```yaml
# infrastructure/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-notifications
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook-url
---
# infrastructure/notifications/alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: doks-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-notifications
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 9: Verify the Deployment

```bash
# Check all Flux resources
flux get all

# Verify image automation is working
flux get image repository demo-app
flux get image policy demo-app

# Check the deployed application
kubectl get all -n demo-app

# Check the ingress and load balancer
kubectl get ingress -n demo-app
kubectl get svc -n ingress-nginx
```

## Step 10: Set Up DigitalOcean Monitoring

Enable monitoring for your DOKS cluster alongside Flux.

```bash
# Install the DigitalOcean monitoring agent if not already present
doctl kubernetes cluster get flux-cluster \
  --format ID,Name,Status

# Enable monitoring via 1-click app
doctl kubernetes 1-click install flux-cluster \
  --1-clicks monitoring
```

## Troubleshooting

### DOCR Image Pull Errors

```bash
# Verify the registry is integrated with the cluster
doctl kubernetes cluster registry get flux-cluster

# Check image pull secrets in the target namespace
kubectl get secrets -n demo-app | grep registry

# If needed, patch the default service account
kubectl patch serviceaccount default -n demo-app \
  -p '{"imagePullSecrets": [{"name": "docr-credentials"}]}'
```

### Flux Reconciliation Failures

```bash
# Check Flux logs for errors
flux logs --level=error --since=1h

# Force reconciliation
flux reconcile kustomization demo-app --with-source

# Check events in the flux-system namespace
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

### Load Balancer Not Provisioning

```bash
# Check the service status
kubectl describe svc -n ingress-nginx ingress-nginx-controller

# Verify DigitalOcean load balancer status
doctl compute load-balancer list
```

## Summary

You have successfully set up Flux CD on DigitalOcean Kubernetes with full integration to DigitalOcean Container Registry. The setup includes GitOps-driven application deployment, automatic image updates when new versions are pushed to DOCR, NGINX ingress with DigitalOcean Load Balancer, and notification alerts. This provides a complete, production-ready GitOps workflow running entirely on DigitalOcean infrastructure.
