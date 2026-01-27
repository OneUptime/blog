# How to Use Rancher Continuous Delivery

By [Nawaz Dhandala](https://github.com/nawazdhandala)

Tags: Rancher, Fleet, GitOps, Kubernetes, Multi-Cluster, CI/CD, Continuous Delivery, DevOps

Description: A comprehensive guide to using Rancher Continuous Delivery (Fleet) for GitOps-based multi-cluster Kubernetes deployments. Learn Fleet configuration, bundle resources, GitOps workflows, and best practices for managing applications at scale.

---

> "The best deployment is the one you don't have to think about." - DevOps Proverb

Rancher Continuous Delivery, powered by Fleet, is a GitOps-at-scale solution built directly into Rancher. It enables you to manage deployments across thousands of Kubernetes clusters from a single Git repository. Unlike traditional CI/CD tools, Fleet watches your Git repos and automatically syncs changes to your target clusters.

## What Is Rancher Continuous Delivery?

Rancher Continuous Delivery uses Fleet under the hood. Fleet is designed for massive scale - it can manage millions of resources across thousands of clusters while maintaining a simple, GitOps-native workflow.

```mermaid
flowchart TB
    subgraph Git["Git Repository"]
        Manifests[Kubernetes Manifests]
        Fleet_yaml[fleet.yaml]
    end

    subgraph Rancher["Rancher Management Server"]
        Fleet_Controller[Fleet Controller]
        Bundle_Controller[Bundle Controller]
    end

    subgraph Downstream["Downstream Clusters"]
        Agent1[Fleet Agent - Cluster 1]
        Agent2[Fleet Agent - Cluster 2]
        Agent3[Fleet Agent - Cluster N]
    end

    Git --> Fleet_Controller
    Fleet_Controller --> Bundle_Controller
    Bundle_Controller --> Agent1
    Bundle_Controller --> Agent2
    Bundle_Controller --> Agent3
```

Key concepts:
1. **GitRepo** - Points to a Git repository containing your Kubernetes manifests
2. **Bundle** - A collection of resources created from a GitRepo
3. **Cluster Groups** - Logical groupings of clusters for targeted deployments
4. **Fleet Agent** - Runs on each downstream cluster to apply changes

## Enabling Continuous Delivery in Rancher

Continuous Delivery comes built into Rancher. Here's how to access and configure it.

### Access the Continuous Delivery Dashboard

```bash
# Continuous Delivery is available in the Rancher UI
# Navigate to: Cluster Management -> Continuous Delivery

# Or access Fleet directly via kubectl on the local cluster
kubectl get gitrepos -n fleet-default
kubectl get bundles -n fleet-default
kubectl get clusters.fleet.cattle.io -n fleet-default
```

### Verify Fleet Components

```bash
# Check Fleet controller status on the management cluster
kubectl get pods -n cattle-fleet-system

# Expected output:
# NAME                                READY   STATUS    RESTARTS   AGE
# fleet-controller-7d4b8c9f4d-xxxxx   1/1     Running   0          1d
# gitjob-7f9c8b6d5-xxxxx              1/1     Running   0          1d

# Check Fleet agent on downstream clusters
kubectl get pods -n cattle-fleet-system --context=downstream-cluster

# Expected output:
# NAME                           READY   STATUS    RESTARTS   AGE
# fleet-agent-6c8d7f9b4-xxxxx    1/1     Running   0          1d
```

## Creating Your First GitRepo

A GitRepo resource tells Fleet where to find your Kubernetes manifests.

### Basic GitRepo Configuration

```yaml
# gitrepo-basic.yaml
# This GitRepo watches a public repository and deploys to all clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: myapp
  namespace: fleet-default  # Use fleet-default for cluster-scoped deployments
spec:
  # Git repository URL - supports HTTPS and SSH
  repo: https://github.com/myorg/myapp-manifests

  # Branch, tag, or commit to track
  branch: main

  # Paths within the repo to watch (optional)
  # If not specified, the entire repo is used
  paths:
    - /manifests
    - /overlays/production

  # How often to poll for changes (default: 15s)
  pollingInterval: 30s

  # Target clusters - empty means all clusters
  targets:
    - clusterSelector: {}
```

Apply the GitRepo:

```bash
# Apply the GitRepo resource to the management cluster
kubectl apply -f gitrepo-basic.yaml

# Watch the GitRepo status
kubectl get gitrepos -n fleet-default -w

# Check bundle creation
kubectl get bundles -n fleet-default
```

### GitRepo with Private Repository

```yaml
# gitrepo-private.yaml
# Configuration for accessing private Git repositories
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: myapp-private
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/private-manifests
  branch: main

  # Reference to a Secret containing credentials
  # The secret must exist in the same namespace
  clientSecretName: git-credentials

  # For SSH-based repos
  # repo: git@github.com:myorg/private-manifests.git

  targets:
    - clusterSelector:
        matchLabels:
          env: production

---
# git-credentials.yaml
# Secret containing Git authentication credentials
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: fleet-default
type: Opaque
stringData:
  # For HTTPS with personal access token
  username: git-user
  password: ghp_xxxxxxxxxxxxxxxxxxxx

  # For SSH (use this instead of username/password)
  # ssh-privatekey: |
  #   -----BEGIN OPENSSH PRIVATE KEY-----
  #   ...
  #   -----END OPENSSH PRIVATE KEY-----
  # known-hosts: |
  #   github.com ssh-rsa AAAA...
```

## Fleet Configuration File

The `fleet.yaml` file in your repository controls how Fleet deploys your resources.

### Basic fleet.yaml Structure

```yaml
# fleet.yaml
# Place this in the root of your manifest directory

# Default namespace for resources without explicit namespace
defaultNamespace: myapp

# Helm chart options (if using Helm)
helm:
  # Release name
  releaseName: myapp

  # Values to pass to the chart
  values:
    replicas: 3
    image:
      tag: v1.2.3

  # Values from ConfigMaps or Secrets
  valuesFrom:
    - configMapKeyRef:
        name: myapp-values
        key: values.yaml

# Kustomize options (if using Kustomize)
kustomize:
  # Path to kustomization.yaml relative to this fleet.yaml
  dir: ./overlays/production

# Raw YAML options
yaml:
  # Overlays to apply (similar to Kustomize patches)
  overlays:
    - name: production-patch
      contents: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: myapp
        spec:
          replicas: 5

# Target specific clusters
targetCustomizations:
  - name: production
    clusterSelector:
      matchLabels:
        env: production
    helm:
      values:
        replicas: 10

  - name: development
    clusterSelector:
      matchLabels:
        env: development
    helm:
      values:
        replicas: 1
```

### Advanced fleet.yaml with Dependencies

```yaml
# fleet.yaml
# Advanced configuration with dependencies and ordering
defaultNamespace: myapp

# Specify dependencies that must be ready before this bundle
dependsOn:
  # Wait for the database bundle to be ready
  - name: database
  # Wait for cert-manager in fleet-system namespace
  - selector:
      matchLabels:
        app: cert-manager

# Resource ordering within this bundle
helm:
  releaseName: myapp
  # Wait for these resources to be ready before marking bundle as ready
  takeOwnership: true

  # Atomic installation - rollback on failure
  atomic: true

  # Maximum time to wait for resources
  timeout: 10m

  values:
    database:
      host: postgres.database.svc.cluster.local
    monitoring:
      enabled: true

# Ignore specific differences to prevent constant reconciliation
diff:
  comparePatches:
    - apiVersion: apps/v1
      kind: Deployment
      operations:
        # Ignore replica count (managed by HPA)
        - path: /spec/replicas
          op: remove
        # Ignore status fields
        - path: /status
          op: remove
```

## Multi-Cluster Deployment Strategies

Fleet excels at deploying to multiple clusters with fine-grained targeting.

### Cluster Selectors and Labels

```yaml
# gitrepo-multi-cluster.yaml
# Deploy different configurations to different cluster groups
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: myapp
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/myapp-manifests
  branch: main

  targets:
    # Target 1: Production clusters in US regions
    - name: production-us
      clusterSelector:
        matchLabels:
          env: production
          region: us
      clusterGroup: production

    # Target 2: Production clusters in EU regions
    - name: production-eu
      clusterSelector:
        matchLabels:
          env: production
          region: eu
      clusterGroup: production

    # Target 3: Staging clusters
    - name: staging
      clusterSelector:
        matchLabels:
          env: staging
      clusterGroup: staging

    # Target 4: All development clusters
    - name: development
      clusterSelector:
        matchExpressions:
          - key: env
            operator: In
            values:
              - dev
              - development
```

### Cluster Groups for Organizational Control

```yaml
# clustergroup-production.yaml
# Define a cluster group with specific configurations
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: production
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      env: production

---
# clustergroup-by-region.yaml
# Regional cluster groups
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: us-east
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      region: us-east

---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: eu-west
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      region: eu-west
```

```mermaid
flowchart TB
    subgraph GitRepo["GitRepo: myapp"]
        Manifests[Application Manifests]
    end

    subgraph Targets["Deployment Targets"]
        T1[Target: production-us]
        T2[Target: production-eu]
        T3[Target: staging]
    end

    subgraph Clusters["Kubernetes Clusters"]
        subgraph US["US Region"]
            C1[prod-us-east-1]
            C2[prod-us-west-2]
        end
        subgraph EU["EU Region"]
            C3[prod-eu-west-1]
            C4[prod-eu-central-1]
        end
        subgraph Staging["Staging"]
            C5[staging-1]
        end
    end

    GitRepo --> Targets
    T1 --> C1
    T1 --> C2
    T2 --> C3
    T2 --> C4
    T3 --> C5
```

## Bundle Resources

Bundles are the fundamental unit of deployment in Fleet. Understanding them is key to troubleshooting.

### Understanding Bundle Structure

```bash
# List all bundles
kubectl get bundles -n fleet-default

# Get detailed bundle information
kubectl describe bundle myapp -n fleet-default

# Check bundle deployment status
kubectl get bundledeployments -A

# View bundle resources
kubectl get bundledeployments -n fleet-default -o yaml
```

### Bundle Status and Troubleshooting

```yaml
# Example bundle status output
apiVersion: fleet.cattle.io/v1alpha1
kind: Bundle
metadata:
  name: myapp
  namespace: fleet-default
status:
  # Summary of bundle state across all clusters
  summary:
    ready: 3           # Clusters with successful deployment
    desiredReady: 5    # Total clusters targeted
    notReady: 2        # Clusters with issues

  # Per-cluster status
  partitions:
    - name: production-us
      count: 2
      summary:
        ready: 2

  # Conditions indicating overall health
  conditions:
    - type: Ready
      status: "False"
      reason: "NotReady"
      message: "2 clusters are not ready"
```

### Customizing Bundle Behavior

```yaml
# fleet.yaml with bundle customization
defaultNamespace: myapp

# Control bundle naming
name: myapp-bundle

# Labels applied to the bundle
labels:
  team: backend
  app: myapp

# Paused bundles won't sync
paused: false

# Rollout strategy
rolloutStrategy:
  # Maximum number of clusters to update simultaneously
  maxConcurrent: 2

  # Maximum number of unavailable clusters during rollout
  maxUnavailable: 1

  # Auto-pause on errors
  autoPartitionSize: 5

# Keep resources after GitRepo deletion
keepResources: false
```

## GitOps Workflows

### Repository Structure for Fleet

```
myapp-fleet/
├── README.md
├── fleet.yaml                    # Root fleet configuration
├── manifests/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── ingress.yaml
├── overlays/
│   ├── production/
│   │   ├── fleet.yaml           # Production-specific config
│   │   ├── kustomization.yaml
│   │   └── patches/
│   │       └── replicas.yaml
│   ├── staging/
│   │   ├── fleet.yaml
│   │   └── kustomization.yaml
│   └── development/
│       ├── fleet.yaml
│       └── kustomization.yaml
└── charts/
    └── myapp/
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
```

### Progressive Delivery Workflow

```yaml
# gitrepo-progressive.yaml
# Implement staged rollouts across environments
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: myapp
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/myapp-manifests
  branch: main
  paths:
    - /overlays

  targets:
    # Stage 1: Deploy to canary cluster first
    - name: canary
      clusterSelector:
        matchLabels:
          role: canary

    # Stage 2: Deploy to staging (depends on canary success)
    - name: staging
      clusterSelector:
        matchLabels:
          env: staging

    # Stage 3: Production rollout in waves
    - name: production-wave-1
      clusterSelector:
        matchLabels:
          env: production
          wave: "1"

    - name: production-wave-2
      clusterSelector:
        matchLabels:
          env: production
          wave: "2"
```

```mermaid
flowchart LR
    subgraph Pipeline["Progressive Delivery Pipeline"]
        direction LR
        Canary[Canary Cluster] --> Staging[Staging Clusters]
        Staging --> Wave1[Production Wave 1]
        Wave1 --> Wave2[Production Wave 2]
    end

    subgraph Validation["Health Checks"]
        HC1[Metrics Check]
        HC2[Smoke Tests]
        HC3[User Feedback]
    end

    Canary --> HC1
    Staging --> HC2
    Wave1 --> HC3
```

## Working with Helm Charts

Fleet natively supports Helm charts with full values customization.

### Deploying Helm Charts from Git

```yaml
# fleet.yaml for Helm chart in repository
defaultNamespace: myapp

helm:
  # Chart path relative to fleet.yaml
  chart: ./charts/myapp

  # Release name
  releaseName: myapp

  # Helm values
  values:
    replicaCount: 3
    image:
      repository: myorg/myapp
      tag: v1.2.3

    resources:
      limits:
        cpu: "1"
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 128Mi

    ingress:
      enabled: true
      hosts:
        - host: myapp.example.com
          paths:
            - path: /
              pathType: Prefix

  # Values files (merged in order)
  valuesFiles:
    - values.yaml
    - values-production.yaml

targetCustomizations:
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging
    helm:
      values:
        replicaCount: 1
        ingress:
          hosts:
            - host: myapp.staging.example.com
              paths:
                - path: /
                  pathType: Prefix
```

### Deploying Helm Charts from Repositories

```yaml
# gitrepo-helm-repo.yaml
# Deploy charts from external Helm repositories
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: infrastructure
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/fleet-config
  branch: main
  paths:
    - /helm-releases

---
# In your Git repo: helm-releases/nginx-ingress/fleet.yaml
defaultNamespace: ingress-nginx

helm:
  # External Helm repository
  repo: https://kubernetes.github.io/ingress-nginx
  chart: ingress-nginx
  version: 4.8.3

  releaseName: nginx-ingress

  values:
    controller:
      replicaCount: 2
      service:
        type: LoadBalancer
      metrics:
        enabled: true
```

## Monitoring Fleet Deployments

### Fleet Metrics and Status

```bash
# Check overall Fleet health
kubectl get gitrepos -n fleet-default -o wide

# NAME     REPO                                    COMMIT          BUNDLEDEPLOYMENTS-READY   STATUS
# myapp    https://github.com/myorg/myapp-manifests   abc1234         5/5                       Active

# Check bundle deployment details
kubectl get bundledeployments -A -o wide

# Monitor Fleet controller logs
kubectl logs -n cattle-fleet-system -l app=fleet-controller -f

# Check for errors in GitJob
kubectl logs -n cattle-fleet-system -l app=gitjob -f
```

### Integrating with OneUptime for Observability

For comprehensive monitoring of your Fleet-managed deployments, integrate with [OneUptime](https://oneuptime.com). OneUptime provides:

- **Real-time deployment monitoring** - Track the health of applications deployed via Fleet
- **Alert management** - Get notified when bundle deployments fail
- **Incident response** - Automatic incident creation for deployment failures
- **Status pages** - Communicate deployment status to stakeholders

```yaml
# Example: Deploy OneUptime probe alongside your applications
# fleet.yaml
defaultNamespace: myapp

helm:
  releaseName: myapp
  values:
    # Your application values
    replicaCount: 3

    # Configure health checks that OneUptime can monitor
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5

    # Expose metrics for OneUptime
    serviceMonitor:
      enabled: true
      endpoints:
        - port: metrics
          path: /metrics
          interval: 30s
```

## Troubleshooting Common Issues

### GitRepo Not Syncing

```bash
# Check GitRepo status
kubectl describe gitrepo myapp -n fleet-default

# Common issues:
# 1. Authentication failure - check clientSecretName
# 2. Invalid path - verify paths exist in repo
# 3. Rate limiting - check pollingInterval

# Force a sync
kubectl patch gitrepo myapp -n fleet-default --type=merge \
  -p '{"spec":{"forceSyncGeneration":'$(date +%s)'}}'
```

### Bundle Stuck in Not Ready State

```bash
# Get bundle deployment status
kubectl get bundledeployments -n fleet-default -l fleet.cattle.io/bundle-name=myapp

# Check specific cluster deployment
kubectl describe bundledeployment myapp-cluster1 -n fleet-default

# View Fleet agent logs on the downstream cluster
kubectl logs -n cattle-fleet-system -l app=fleet-agent -f --context=downstream-cluster
```

### Resources Not Being Applied

```yaml
# fleet.yaml - debugging configuration
defaultNamespace: myapp

# Enable diff logging
diff:
  comparePatches: []

# Force resource ownership
helm:
  takeOwnership: true

  # Increase timeout for slow clusters
  timeout: 15m

  # Force recreate on update
  force: true
```

## Best Practices

### 1. Use Workspaces for Multi-Tenancy

```yaml
# Separate namespaces for different teams
# Team A workspace
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: team-a-apps
  namespace: fleet-team-a  # Team-specific namespace
spec:
  repo: https://github.com/team-a/apps
  branch: main
  targets:
    - clusterSelector:
        matchLabels:
          team: team-a
```

### 2. Implement Proper RBAC

```yaml
# fleet-rbac.yaml
# Restrict GitRepo creation to authorized users
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: fleet-developer
  namespace: fleet-default
rules:
  - apiGroups: ["fleet.cattle.io"]
    resources: ["gitrepos"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["fleet.cattle.io"]
    resources: ["bundles", "bundledeployments"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: fleet-admin
  namespace: fleet-default
rules:
  - apiGroups: ["fleet.cattle.io"]
    resources: ["*"]
    verbs: ["*"]
```

### 3. Version Your Deployments

```yaml
# Use Git tags for production deployments
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: myapp-production
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/myapp-manifests
  # Use a specific tag instead of branch for production
  revision: v1.2.3
  targets:
    - clusterSelector:
        matchLabels:
          env: production
```

### 4. Monitor Bundle Health

```yaml
# Create alerts for bundle failures
# This can integrate with your monitoring stack
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: fleet-alerts
  namespace: cattle-fleet-system
spec:
  groups:
    - name: fleet
      rules:
        - alert: FleetBundleNotReady
          expr: fleet_bundle_desired_ready - fleet_bundle_ready > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Fleet bundle not fully deployed"
            description: "Bundle {{ $labels.name }} has clusters not ready"
```

---

Rancher Continuous Delivery with Fleet brings GitOps to multi-cluster Kubernetes at scale. Start with a single GitRepo targeting all clusters, then gradually add cluster groups and customizations as your infrastructure grows. The key is keeping your Git repositories well-organized and using Fleet's targeting capabilities to manage environment-specific configurations. For complete observability of your Fleet-managed deployments, consider integrating with [OneUptime](https://oneuptime.com) to monitor application health, track deployment status, and respond to incidents quickly.
