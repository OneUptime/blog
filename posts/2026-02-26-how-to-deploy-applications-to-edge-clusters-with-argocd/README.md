# How to Deploy Applications to Edge Clusters with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Edge Computing, Deployment

Description: A practical guide to deploying and managing applications across distributed edge Kubernetes clusters using ArgoCD with hub-spoke topology and ApplicationSets.

---

Deploying applications to edge clusters is fundamentally different from deploying to a centralized cloud. Edge clusters are often resource-constrained, running on small hardware, behind firewalls, and sometimes disconnected from the network. Despite these challenges, you still need reliable, repeatable deployments.

ArgoCD gives you a centralized control plane for deploying to any number of remote edge clusters. This post walks through the practical steps of setting up ArgoCD to deploy applications to edge Kubernetes clusters, covering everything from cluster registration to handling the unique constraints of edge environments.

## Prerequisites

Before starting, you need a central management cluster running ArgoCD (the hub), one or more edge clusters running a lightweight Kubernetes distribution like K3s or MicroK8s, and network connectivity from the hub to edge clusters (even if intermittent). The edge clusters do not need to reach the hub - ArgoCD initiates all connections outbound from the hub.

## Setting Up the Hub Cluster

Install ArgoCD on your central management cluster with the HA manifest for production use.

```bash
# Install ArgoCD HA on the hub cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=argocd -n argocd --timeout=300s
```

## Registering Edge Clusters

There are two approaches to registering edge clusters: using the ArgoCD CLI or creating cluster secrets directly.

The CLI approach is simpler for a small number of clusters.

```bash
# Add an edge cluster using the CLI
# This requires kubectl context access to the edge cluster
argocd cluster add edge-site-portland \
  --name edge-site-portland \
  --label edge-region=us-west \
  --label edge-type=retail \
  --kubeconfig /path/to/edge-kubeconfig
```

For automated fleet provisioning, create cluster secrets directly. This is better for large-scale deployments because you can generate these secrets as part of your device provisioning pipeline.

```yaml
# edge-cluster-secret.yaml
# Creates a cluster entry that ArgoCD can deploy to
apiVersion: v1
kind: Secret
metadata:
  name: edge-portland-01
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    edge-region: us-west
    edge-site: portland
    edge-hardware: nuc
type: Opaque
stringData:
  name: edge-portland-01
  server: https://10.50.1.100:6443
  config: |
    {
      "bearerToken": "eyJhbGciOiJSUzI1...",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    }
```

## Structuring Your Git Repository

A well-organized Git repository is critical for edge deployments. You need to separate base configurations from site-specific customizations.

```
edge-deployments/
  base/
    point-of-sale/
      deployment.yaml
      service.yaml
      kustomization.yaml
    inventory-agent/
      deployment.yaml
      configmap.yaml
      kustomization.yaml
  overlays/
    us-west/
      kustomization.yaml          # Regional settings
      resource-limits-patch.yaml  # Hardware-specific limits
    us-east/
      kustomization.yaml
      resource-limits-patch.yaml
  site-configs/
    portland-01/
      kustomization.yaml          # References regional overlay
      site-config.yaml            # Site-specific config
    portland-02/
      kustomization.yaml
      site-config.yaml
```

Each site's kustomization.yaml references the regional overlay, which in turn references the base.

```yaml
# site-configs/portland-01/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../overlays/us-west
patches:
  - path: site-config.yaml
```

## Deploying with ApplicationSets

The ApplicationSet controller generates one ArgoCD Application per edge cluster. Use the cluster generator to automatically target all registered edge clusters.

```yaml
# appset-pos-system.yaml
# Deploys the point-of-sale system to all retail edge clusters
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: edge-pos-system
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            edge-type: retail
  template:
    metadata:
      name: 'pos-{{name}}'
      labels:
        app-type: point-of-sale
        edge-site: '{{name}}'
    spec:
      project: edge-retail
      source:
        repoURL: https://github.com/company/edge-deployments
        targetRevision: main
        path: 'site-configs/{{name}}'
      destination:
        server: '{{server}}'
        namespace: pos-system
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
          - ApplyOutOfSyncOnly=true
        retry:
          limit: 10
          backoff:
            duration: 1m
            factor: 2
            maxDuration: 15m
```

The `ApplyOutOfSyncOnly=true` option is important for edge - it tells ArgoCD to only sync resources that actually changed, reducing the amount of API calls to the edge cluster.

## Resource Constraints for Edge Hardware

Edge devices typically have limited CPU and memory. Your deployments need to account for this with appropriate resource requests and limits.

```yaml
# overlays/us-west/resource-limits-patch.yaml
# Patch to constrain resources for edge hardware (Intel NUC class)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pos-application
spec:
  template:
    spec:
      containers:
        - name: pos-app
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
      # Tolerate edge-specific taints
      tolerations:
        - key: "edge-device"
          operator: "Exists"
          effect: "NoSchedule"
      # Prefer nodes with SSD storage
      nodeAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
                - key: storage-type
                  operator: In
                  values:
                    - ssd
```

## Handling Image Distribution

One of the biggest challenges with edge deployments is getting container images to edge locations efficiently. You do not want every edge site pulling large images directly from a central registry.

Consider these strategies. First, use an image pull-through cache at each regional hub to reduce bandwidth to edge sites. Second, pre-load images as part of device provisioning. Third, use image digest pinning in your deployments so ArgoCD can detect drift.

```yaml
# In your ArgoCD project, restrict allowed image sources
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: edge-retail
  namespace: argocd
spec:
  description: "Edge retail applications"
  # Only allow images from approved registries
  sourceRepos:
    - 'https://github.com/company/edge-deployments'
  destinations:
    - namespace: '*'
      server: '*'
  # Restrict which registries edge apps can use
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
```

## Sync Windows for Edge Deployments

Retail and manufacturing edge sites often have maintenance windows. You do not want ArgoCD deploying updates during peak business hours. Use sync windows to control when deployments happen.

```yaml
# In the AppProject spec, define sync windows
spec:
  syncWindows:
    # Allow syncs only during off-hours for retail sites
    - kind: allow
      schedule: '0 2 * * *'    # 2 AM daily
      duration: 4h             # 4-hour maintenance window
      applications:
        - 'pos-*'
      clusters:
        - 'edge-*'
    # Block syncs during Black Friday weekend
    - kind: deny
      schedule: '0 0 25 11 *'  # Nov 25
      duration: 96h            # 4 days
      applications:
        - '*'
      clusters:
        - 'edge-*'
```

## Verifying Deployments

After deploying to edge clusters, you need to verify that applications are actually healthy. ArgoCD's health checks handle this automatically, but you can add custom health checks for edge-specific resources.

```bash
# Check the sync status of all edge applications
argocd app list -l app-type=point-of-sale -o json | \
  jq '.[] | {name: .metadata.name, sync: .status.sync.status, health: .status.health.status}'

# Force a refresh for a specific edge site
argocd app get pos-edge-portland-01 --refresh
```

## Monitoring Deployment Health

Track deployment health across your edge fleet by watching ArgoCD's metrics.

```yaml
# PrometheusRule for alerting on edge deployment issues
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: edge-deployment-alerts
spec:
  groups:
    - name: edge-deployments
      rules:
        - alert: EdgeAppOutOfSync
          expr: |
            argocd_app_info{sync_status="OutOfSync",name=~"pos-.*"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Edge app {{ $labels.name }} has been out of sync for 30 minutes"
```

## Wrapping Up

Deploying to edge clusters with ArgoCD follows the same GitOps principles as cloud deployments, but with extra attention to resource constraints, network reliability, and maintenance windows. The combination of cluster secrets for registration, ApplicationSets for fleet-wide deployment, Kustomize overlays for site-specific config, and sync windows for controlled rollouts gives you a production-ready edge deployment pipeline.

The key insight is that ArgoCD's pull-based model works well even when edge connectivity is unreliable. ArgoCD will keep retrying until the edge cluster is reachable and in sync, which is exactly what you need for distributed edge infrastructure.
