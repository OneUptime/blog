# How to Set Up Flux CD on Gardener Managed Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Gardener, Kubernetes, GitOps, SAP, Managed kubernetes, Continuous Delivery, Multi-Cloud

Description: A practical guide to deploying Flux CD on SAP Gardener managed Kubernetes clusters for GitOps-driven application delivery across multiple cloud providers.

---

## Introduction

Gardener is an open-source Kubernetes-native system that manages Kubernetes clusters as a service. Originally developed by SAP, Gardener provides a uniform Kubernetes experience across AWS, Azure, GCP, OpenStack, and other infrastructure providers. It follows the "Kubernetes inception" model, using Kubernetes to manage Kubernetes clusters.

Integrating Flux CD with Gardener-managed clusters enables GitOps workflows that work consistently regardless of the underlying cloud provider. This guide walks through setting up Flux CD on a Gardener shoot cluster.

## Prerequisites

Before starting, ensure you have:

- Access to a Gardener dashboard or API
- A Gardener project with permissions to create shoot clusters
- `kubectl` and `gardenctl` CLI tools installed
- `flux` CLI installed
- A GitHub account with a personal access token
- `gardenlogin` credential plugin configured

## Installing Required CLI Tools

Install the tools you need:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Install gardenctl
curl -sL https://github.com/gardener/gardenctl-v2/releases/latest/download/gardenctl_v2_linux_amd64 \
  -o /usr/local/bin/gardenctl
chmod +x /usr/local/bin/gardenctl

# Install gardenlogin credential plugin
curl -sL https://github.com/gardener/gardenlogin/releases/latest/download/gardenlogin_linux_amd64 \
  -o /usr/local/bin/gardenlogin
chmod +x /usr/local/bin/gardenlogin

# Verify installations
flux --version
gardenctl version
```

## Creating a Gardener Shoot Cluster

Create a shoot cluster using the Gardener API. Here is a shoot manifest for AWS:

```yaml
# shoot-cluster.yaml
apiVersion: core.gardener.cloud/v1beta1
kind: Shoot
metadata:
  name: flux-cluster
  namespace: garden-my-project
spec:
  cloudProfileName: aws
  region: eu-west-1
  secretBindingName: my-aws-credentials
  provider:
    type: aws
    infrastructureConfig:
      apiVersion: aws.provider.extensions.gardener.cloud/v1alpha1
      kind: InfrastructureConfig
      networks:
        vpc:
          cidr: 10.250.0.0/16
        zones:
          - name: eu-west-1a
            internal: 10.250.112.0/22
            public: 10.250.96.0/22
            workers: 10.250.0.0/19
    controlPlaneConfig:
      apiVersion: aws.provider.extensions.gardener.cloud/v1alpha1
      kind: ControlPlaneConfig
    workers:
      - name: worker-pool
        machine:
          type: m5.xlarge
          image:
            name: gardenlinux
            version: "1312.3.0"
        maximum: 5
        minimum: 2
        maxSurge: 1
        maxUnavailable: 0
        zones:
          - eu-west-1a
        volume:
          type: gp3
          size: 50Gi
  kubernetes:
    version: "1.30.2"
    enableStaticTokenKubeconfig: false
  networking:
    type: calico
    pods: 100.96.0.0/11
    services: 100.64.0.0/13
    nodes: 10.250.0.0/16
  maintenance:
    autoUpdate:
      kubernetesVersion: true
      machineImageVersion: true
    timeWindow:
      begin: "020000+0000"
      end: "040000+0000"
  hibernation:
    schedules:
      - start: "0 18 * * 1,2,3,4,5"
        end: "0 8 * * 1,2,3,4,5"
        location: Europe/Berlin
```

Apply the shoot cluster:

```bash
# Create the shoot cluster
kubectl apply -f shoot-cluster.yaml --kubeconfig=~/.kube/garden-kubeconfig

# Monitor the shoot creation
gardenctl target --garden my-garden --project my-project --shoot flux-cluster
gardenctl get shoot
```

## Accessing the Shoot Cluster

Configure kubectl access to your shoot cluster:

```bash
# Target the shoot cluster
gardenctl target --garden my-garden --project my-project --shoot flux-cluster

# Generate kubeconfig
gardenctl kubeconfig --output ~/.kube/gardener-flux-config

# Set KUBECONFIG
export KUBECONFIG=~/.kube/gardener-flux-config

# Verify access
kubectl get nodes
kubectl cluster-info
```

## Running Flux Pre-flight Checks

Verify that the Gardener shoot cluster supports Flux:

```bash
# Run pre-flight checks
flux check --pre
```

Gardener shoots are standard CNCF-conformant Kubernetes clusters, so all checks should pass.

## Bootstrapping Flux CD

Set up GitHub credentials and bootstrap Flux:

```bash
# Set GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=gardener-gitops \
  --branch=main \
  --path=./clusters/gardener-aws \
  --personal
```

## Verifying the Installation

Confirm Flux is running correctly:

```bash
# Check Flux health
flux check

# List Flux pods
kubectl get pods -n flux-system

# Verify Git source
flux get sources git
```

## Organizing the Repository for Multi-Cloud

Gardener's strength is multi-cloud management. Structure your repository to support multiple shoot clusters:

```bash
# Clone the repository
git clone https://github.com/$GITHUB_USER/gardener-gitops.git
cd gardener-gitops

# Create a multi-cloud directory structure
mkdir -p clusters/gardener-aws/infrastructure
mkdir -p clusters/gardener-aws/apps
mkdir -p clusters/gardener-gcp/infrastructure
mkdir -p clusters/gardener-gcp/apps
mkdir -p infrastructure/common
mkdir -p infrastructure/aws
mkdir -p infrastructure/gcp
mkdir -p apps/base
mkdir -p apps/overlays/aws
mkdir -p apps/overlays/gcp
```

## Deploying Common Infrastructure

Set up infrastructure components that are shared across all Gardener clusters:

```yaml
# infrastructure/common/sources.yaml
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
```

```yaml
# infrastructure/common/cert-manager.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
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
    # Gardener manages DNS, so disable DNS challenge solvers by default
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

## Deploying Cloud-Specific Infrastructure

Configure AWS-specific infrastructure components:

```yaml
# infrastructure/aws/ingress.yaml
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
      replicaCount: 2
      service:
        # AWS-specific annotations for NLB
        type: LoadBalancer
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
          service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

Wire infrastructure into the cluster path:

```yaml
# clusters/gardener-aws/infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../infrastructure/common/sources.yaml
  - ../../../infrastructure/common/cert-manager.yaml
  - ../../../infrastructure/aws/ingress.yaml
```

```yaml
# clusters/gardener-aws/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/gardener-aws/infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

## Deploying Applications

Create a base application with cloud-specific overlays:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    managed-by: flux
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-service
  template:
    metadata:
      labels:
        app: web-service
    spec:
      containers:
        - name: web
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
  name: web-service
  namespace: production
spec:
  selector:
    app: web-service
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
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

```yaml
# apps/overlays/aws/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: web-service
        namespace: production
      spec:
        # AWS has more resources, scale up
        replicas: 3
    target:
      kind: Deployment
      name: web-service
```

```yaml
# clusters/gardener-aws/apps/web-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-service
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure
  path: ./apps/overlays/aws
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-service
      namespace: production
  timeout: 3m
```

## Working with Gardener Hibernation

Gardener supports cluster hibernation to save costs. Configure Flux to handle hibernation gracefully:

```yaml
# clusters/gardener-aws/apps/hibernation-aware.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-service
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/overlays/aws
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Longer timeout to handle post-hibernation reconciliation
  timeout: 10m
  # Retry on failure (cluster might be waking from hibernation)
  retryInterval: 2m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-service
      namespace: production
```

## Leveraging Gardener DNS and Certificates

Gardener provides built-in DNS and certificate management through extensions. Use them alongside Flux:

```yaml
# apps/base/dns-entry.yaml
# Gardener DNSEntry for automatic DNS management
apiVersion: dns.gardener.cloud/v1alpha1
kind: DNSEntry
metadata:
  name: web-service
  namespace: production
  annotations:
    dns.gardener.cloud/class: garden
spec:
  dnsName: web.example.com
  ttl: 300
  targets:
    - 1.2.3.4
```

```yaml
# apps/base/certificate.yaml
# Gardener Certificate for automatic TLS
apiVersion: cert.gardener.cloud/v1alpha1
kind: Certificate
metadata:
  name: web-service-tls
  namespace: production
spec:
  commonName: web.example.com
  secretRef:
    name: web-service-tls
    namespace: production
```

## Setting Up Notifications

Configure Flux alerts for your Gardener clusters:

```yaml
# clusters/gardener-aws/apps/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: gardener-deployments
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gardener-alerts
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

Common debugging commands for Flux on Gardener:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller

# Force reconciliation
flux reconcile kustomization flux-system --with-source

# Check if the cluster is hibernating
gardenctl get shoot

# View Flux events
flux events

# Check Gardener-managed components
kubectl get managedresources -n kube-system

# Verify DNS and certificate status
kubectl get dnsentries -A
kubectl get certificates -A

# Reconnect after hibernation wake-up
gardenctl kubeconfig --output ~/.kube/gardener-flux-config
export KUBECONFIG=~/.kube/gardener-flux-config
```

## Conclusion

You now have Flux CD running on a Gardener-managed Kubernetes cluster. This setup provides a consistent GitOps experience across any cloud provider supported by Gardener. The multi-cloud directory structure allows you to share common configurations while applying cloud-specific customizations through Kustomize overlays. With Gardener handling cluster lifecycle management and Flux managing application delivery, you have a complete platform for running workloads at scale across multiple clouds.
