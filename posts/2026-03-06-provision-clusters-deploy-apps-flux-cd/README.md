# How to Provision Clusters and Deploy Apps with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, cluster provisioning, gitops, kubernetes, multi-cluster, application deployment

Description: A complete guide to using Flux CD as the single control plane for both cluster provisioning and application deployment across your infrastructure.

---

## Introduction

Most organizations treat cluster provisioning and application deployment as separate concerns with different tools and workflows. Flux CD can unify both under a single GitOps workflow. Using Flux on a management cluster, you can provision new Kubernetes clusters (via Cluster API or Crossplane) and then automatically deploy applications to those clusters, all driven from a single Git repository.

This guide demonstrates a complete workflow from cluster creation to running applications, managed entirely through Flux CD.

## Prerequisites

- A management Kubernetes cluster with Flux CD installed
- Cluster API or Crossplane installed for cluster provisioning
- kubectl and flux CLI installed
- A Git repository for fleet management

## Repository Structure

Organize your Git repository to separate concerns clearly.

```
fleet-infra/
├── clusters/
│   ├── management/           # Management cluster config
│   │   ├── flux-system/      # Flux bootstrap
│   │   └── kustomization.yaml
│   ├── definitions/          # Workload cluster definitions
│   │   ├── staging-east.yaml
│   │   └── production-east.yaml
│   └── workloads/            # Per-cluster app configs
│       ├── staging-east/
│       │   ├── infrastructure.yaml
│       │   └── apps.yaml
│       └── production-east/
│           ├── infrastructure.yaml
│           └── apps.yaml
├── infrastructure/
│   ├── base/                 # Shared infra components
│   │   ├── cert-manager/
│   │   ├── ingress-nginx/
│   │   └── monitoring/
│   ├── staging/              # Staging overrides
│   └── production/           # Production overrides
└── apps/
    ├── base/                 # Shared app definitions
    │   ├── frontend/
    │   └── backend/
    ├── staging/              # Staging app configs
    └── production/           # Production app configs
```

## Step 1: Configure the Management Cluster

Set up Flux on the management cluster to watch the repository.

```yaml
# clusters/management/kustomization.yaml
# Root kustomization for the management cluster
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - flux-system/
  - cluster-provisioning.yaml
  - cluster-workloads.yaml
```

```yaml
# clusters/management/cluster-provisioning.yaml
# Kustomization that syncs cluster definitions
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-provisioning
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/definitions
  prune: true
  # Allow time for clusters to be provisioned
  timeout: "30m"
  wait: true
```

## Step 2: Define Workload Clusters

Create cluster definitions that will be provisioned by CAPI.

```yaml
# clusters/definitions/staging-east.yaml
# Staging cluster definition using Cluster API
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: staging-east
  namespace: default
  labels:
    environment: staging
    region: us-east-1
    # Label used to trigger automatic Flux bootstrap
    gitops: flux
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["192.168.0.0/16"]
    services:
      cidrBlocks: ["10.128.0.0/12"]
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: staging-east-cp
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: staging-east
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: staging-east
  namespace: default
spec:
  region: us-east-1
  sshKeyName: capi-key
---
# Control plane with 1 replica for staging
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: staging-east-cp
  namespace: default
spec:
  replicas: 1
  version: v1.31.0
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
      kind: AWSMachineTemplate
      name: staging-east-cp
  kubeadmConfigSpec:
    clusterConfiguration: {}
    initConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: external
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: staging-east-cp
  namespace: default
spec:
  template:
    spec:
      instanceType: t3.medium
      iamInstanceProfile: control-plane.cluster-api-provider-aws.sigs.k8s.io
---
# Worker nodes for staging
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: staging-east-workers
  namespace: default
spec:
  clusterName: staging-east
  replicas: 2
  selector:
    matchLabels: {}
  template:
    spec:
      clusterName: staging-east
      version: v1.31.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: staging-east-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: staging-east-workers
---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: KubeadmConfigTemplate
metadata:
  name: staging-east-workers
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          kubeletExtraArgs:
            cloud-provider: external
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: staging-east-workers
  namespace: default
spec:
  template:
    spec:
      instanceType: t3.large
      iamInstanceProfile: nodes.cluster-api-provider-aws.sigs.k8s.io
```

## Step 3: Auto-Bootstrap Flux on Workload Clusters

Configure the management cluster to automatically set up Flux on each new workload cluster using kubeconfig secrets.

```yaml
# clusters/management/cluster-workloads.yaml
# For each workload cluster, create a Kustomization that deploys
# to that cluster using its kubeconfig Secret
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-east-infra
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/staging
  prune: true
  wait: true
  # Use the kubeconfig Secret created by CAPI
  kubeConfig:
    secretRef:
      name: staging-east-kubeconfig
      key: value
  dependsOn:
    - name: cluster-provisioning
  timeout: "15m"
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-east-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/staging
  prune: true
  kubeConfig:
    secretRef:
      name: staging-east-kubeconfig
      key: value
  # Deploy apps only after infrastructure is ready
  dependsOn:
    - name: staging-east-infra
```

## Step 4: Define Infrastructure Components

Create shared infrastructure that gets deployed to every cluster.

```yaml
# infrastructure/base/cert-manager/helmrelease.yaml
# Install cert-manager for TLS certificate management
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 15m
  chart:
    spec:
      chart: cert-manager
      version: "1.16.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    createNamespace: true
    # Install CRDs with the chart
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    # Enable Prometheus metrics
    prometheus:
      enabled: true
    # Resource requests for stability
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
```

```yaml
# infrastructure/base/monitoring/helmrelease.yaml
# Install Prometheus and Grafana monitoring stack
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: monitoring
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "65.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  install:
    createNamespace: true
    crds: CreateReplace
  values:
    grafana:
      enabled: true
    alertmanager:
      enabled: true
    prometheus:
      prometheusSpec:
        retention: 7d
```

## Step 5: Define Application Deployments

Create application definitions with environment-specific overrides.

```yaml
# apps/base/backend/deployment.yaml
# Base backend application deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: api
          image: my-org/backend-api:latest
          ports:
            - containerPort: 8080
          env:
            - name: ENVIRONMENT
              value: "${ENVIRONMENT}"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              memory: 512Mi
          # Health check probes
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: default
spec:
  selector:
    app: backend-api
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# apps/staging/kustomization.yaml
# Staging-specific overrides for applications
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base/backend
  - ../base/frontend
patches:
  # Override replica count for staging
  - target:
      kind: Deployment
      name: backend-api
    patch: |
      - op: replace
        path: /spec/replicas
        value: 1
```

```yaml
# apps/production/kustomization.yaml
# Production-specific overrides
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base/backend
  - ../base/frontend
patches:
  # Scale up for production
  - target:
      kind: Deployment
      name: backend-api
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
```

## Monitoring the Full Pipeline

Monitor both cluster provisioning and application deployment.

```bash
# Check cluster provisioning status on the management cluster
kubectl get clusters -A
kubectl get machines -A

# Check Flux sync status for all targets
flux get kustomizations -A

# Check workload cluster health
KUBECONFIG=staging-east.kubeconfig kubectl get nodes
KUBECONFIG=staging-east.kubeconfig kubectl get pods -A

# View Flux events for debugging
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

## Adding a New Cluster

To add a new cluster to the fleet, add the definition files to Git.

```bash
# Create the cluster definition file
# Copy and modify from an existing cluster template
cp clusters/definitions/staging-east.yaml clusters/definitions/staging-west.yaml

# Update the file with new cluster details (name, region, etc.)
# Then commit and push
git add clusters/definitions/staging-west.yaml
git commit -m "Add staging-west cluster"
git push

# Flux syncs the definition, CAPI provisions the cluster,
# then Flux deploys infrastructure and apps to the new cluster
```

## Conclusion

Using Flux CD as the single control plane for both cluster provisioning and application deployment simplifies your operations. Everything is in Git: cluster definitions, infrastructure components, and applications. Adding a new cluster is a pull request. Scaling an application is a pull request. Upgrading Kubernetes is a pull request. This unified approach reduces the number of tools your team needs to learn and gives you a complete audit trail for every change across your entire infrastructure.
