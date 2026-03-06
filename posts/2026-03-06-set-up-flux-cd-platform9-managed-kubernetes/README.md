# How to Set Up Flux CD on Platform9 Managed Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, platform9, managed kubernetes, pmk, gitops, continuous delivery, hybrid cloud

Description: A comprehensive guide to deploying Flux CD on Platform9 Managed Kubernetes for GitOps-driven application delivery across hybrid cloud environments.

---

## Introduction

Platform9 Managed Kubernetes (PMK) is a SaaS-managed Kubernetes platform that runs on any infrastructure, including bare metal servers, private clouds, and public cloud VMs. Platform9 handles the control plane management, monitoring, and upgrades while you provide the compute nodes. This makes it an excellent choice for organizations that want managed Kubernetes without being locked into a single cloud provider.

Integrating Flux CD with Platform9 provides a GitOps workflow that automates application deployments across your hybrid infrastructure managed by Platform9.

## Prerequisites

Before you begin, ensure you have:

- A Platform9 account with a deployed Kubernetes cluster
- Access to the Platform9 management console
- `kubectl` configured to access your Platform9 cluster
- `flux` CLI installed on your workstation
- A GitHub account with a personal access token
- At least two worker nodes in your Platform9 cluster

## Installing the Flux CLI

Install the Flux CLI on your workstation:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Accessing Your Platform9 Cluster

Download the kubeconfig from the Platform9 management console or use the CLI:

```bash
# Download kubeconfig from Platform9 UI:
# Navigate to Clusters > Your Cluster > Download Kubeconfig

# Set the KUBECONFIG environment variable
export KUBECONFIG=~/.kube/platform9-config

# Verify cluster access
kubectl get nodes
kubectl cluster-info
```

Alternatively, use the Platform9 CLI tool:

```bash
# Install pf9ctl
pip install pf9ctl

# Configure pf9ctl
pf9ctl config set \
  --account-url https://your-account.platform9.io \
  --username admin@example.com \
  --region us-east-1

# Get kubeconfig
pf9ctl cluster credentials --name flux-cluster --output ~/.kube/platform9-config
```

## Verifying the Platform9 Cluster

Confirm the cluster is healthy before installing Flux:

```bash
# Check node status
kubectl get nodes -o wide

# Verify system components
kubectl get pods -n kube-system

# Check available storage classes
kubectl get sc

# Verify RBAC is enabled
kubectl auth can-i create clusterrolebinding --all-namespaces
```

## Running Flux Pre-flight Checks

```bash
# Run pre-flight checks
flux check --pre
```

Platform9 clusters are CNCF-conformant and provide all APIs required by Flux.

## Bootstrapping Flux CD

Set up GitHub credentials and bootstrap Flux:

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=platform9-gitops \
  --branch=main \
  --path=./clusters/platform9 \
  --personal
```

## Verifying the Flux Installation

Confirm all Flux components are running:

```bash
# Check Flux health
flux check

# List Flux pods
kubectl get pods -n flux-system

# Verify Git source
flux get sources git

# List all Flux resources
flux get all
```

## Setting Up the Repository Structure

Organize your GitOps repository:

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/platform9-gitops.git
cd platform9-gitops

# Create directory structure
mkdir -p clusters/platform9/infrastructure
mkdir -p clusters/platform9/apps
mkdir -p infrastructure/sources
mkdir -p infrastructure/controllers
mkdir -p infrastructure/storage
mkdir -p apps/base
mkdir -p apps/staging
mkdir -p apps/production
```

## Deploying Infrastructure Components

Set up core infrastructure managed by Flux:

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
  name: cert-manager
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.jetstack.io
---
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
  targetNamespace: ingress-nginx
  install:
    createNamespace: true
  values:
    controller:
      replicaCount: 2
      service:
        # Platform9 supports MetalLB or cloud LB depending on infrastructure
        type: LoadBalancer
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
      metrics:
        enabled: true
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
        name: cert-manager
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

Wire infrastructure into the cluster configuration:

```yaml
# clusters/platform9/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/sources/helm-repos.yaml
  - ../../../infrastructure/controllers/ingress.yaml
  - ../../../infrastructure/controllers/cert-manager.yaml
```

```yaml
# clusters/platform9/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/platform9/infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

## Deploying Applications

Create a production application:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    managed-by: flux
    environment: production
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform9-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: platform9-app
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: platform9-app
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
              cpu: 250m
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
      # Spread pods across nodes for high availability
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: platform9-app
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: platform9-app
  namespace: production
spec:
  selector:
    app: platform9-app
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
  name: platform9-app
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: platform9-app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: platform9-app
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

Create the Flux Kustomization to deploy the application:

```yaml
# clusters/platform9/apps/production-app.yaml
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
      name: platform9-app
      namespace: production
  timeout: 3m
```

## Deploying Monitoring

Set up monitoring that works alongside Platform9's built-in monitoring:

```yaml
# infrastructure/controllers/monitoring.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
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
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
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
    grafana:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
      # Import Flux dashboards
      dashboardProviders:
        dashboardproviders.yaml:
          apiVersion: 1
          providers:
            - name: flux
              orgId: 1
              folder: Flux
              type: file
              disableDeletion: false
              editable: true
              options:
                path: /var/lib/grafana/dashboards/flux
```

## Setting Up Multi-Cluster with Platform9

If you manage multiple Platform9 clusters, set up Flux for multi-cluster management:

```yaml
# clusters/platform9/apps/remote-cluster-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: shared-apps
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/<your-org>/shared-applications.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
```

```yaml
# clusters/platform9/apps/shared-apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: shared-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/common
  prune: true
  sourceRef:
    kind: GitRepository
    name: shared-apps
  patches:
    - patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: not-important
          labels:
            platform9.io/cluster: flux-cluster
      target:
        kind: Deployment
```

## Configuring Notifications

Set up deployment notifications:

```yaml
# clusters/platform9/apps/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: platform9-deployments
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: platform9-alerts
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
  summary: "Platform9 cluster deployment event"
```

## Handling Platform9 Upgrades

When Platform9 upgrades your cluster's control plane, Flux handles the transition gracefully:

```bash
# Before a Platform9 upgrade, check current Flux state
flux get all

# Platform9 upgrades are rolling and non-disruptive
# Flux controllers will be briefly restarted during node upgrades

# After the upgrade, verify Flux is healthy
flux check

# Force reconciliation to ensure everything is in sync
flux reconcile kustomization flux-system --with-source

# Verify all applications are healthy
flux get kustomizations
kubectl get pods -n production
```

## Troubleshooting

Common debugging commands:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller
kubectl logs -n flux-system deploy/helm-controller

# Force reconciliation
flux reconcile kustomization flux-system --with-source

# Check Platform9 agent status on nodes
kubectl get pods -n platform9-system

# Verify connectivity to Git repository
flux get sources git

# View Flux events
flux events

# Check for failed reconciliations
flux get kustomizations --status-selector ready=false
flux get helmreleases --status-selector ready=false

# Debug specific Kustomization
flux get kustomization production-app -o yaml

# Suspend and resume during maintenance
flux suspend kustomization production-app
flux resume kustomization production-app
```

## Conclusion

You now have Flux CD running on Platform9 Managed Kubernetes. This combination provides the best of both worlds: Platform9 handles cluster lifecycle management, monitoring, and upgrades, while Flux CD manages application deployments through GitOps. Your applications are deployed consistently from Git, and Platform9 ensures the underlying cluster remains healthy and up to date. This setup works across any infrastructure that Platform9 supports, giving you a portable GitOps platform for hybrid cloud environments.
