# How to Deploy to All Clusters with ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSets, Multi-Cluster

Description: Learn how to use ArgoCD ApplicationSets with the cluster generator to automatically deploy applications to every registered cluster in your fleet.

---

One of the most powerful features of ArgoCD ApplicationSets is the ability to automatically deploy applications to every cluster registered in ArgoCD. When you add a new cluster, the application is deployed automatically. When you remove a cluster, the application is cleaned up. No manual intervention, no forgetting to update a list.

This guide covers the cluster generator in depth, showing how to deploy infrastructure components, monitoring stacks, and shared services across your entire cluster fleet.

## The Cluster Generator Basics

The cluster generator discovers all clusters registered in ArgoCD and creates an Application for each one. At its simplest, it needs no configuration at all.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: deploy-everywhere
  namespace: argocd
spec:
  generators:
    # Empty cluster generator = all clusters
    - clusters: {}
  template:
    metadata:
      name: 'ingress-nginx-{{name}}'
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/myorg/infra.git
        targetRevision: HEAD
        path: ingress-nginx
      destination:
        # {{server}} is the cluster API server URL
        server: '{{server}}'
        namespace: ingress-nginx
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

The cluster generator provides these built-in parameters for each cluster:
- `{{name}}` - The cluster name as registered in ArgoCD
- `{{server}}` - The cluster API server URL
- `{{metadata.labels.<key>}}` - Any labels on the cluster secret

## Including the Local Cluster

By default, the cluster generator includes the in-cluster (local) cluster where ArgoCD runs. The local cluster has the special name `in-cluster` and server URL `https://kubernetes.default.svc`.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: monitoring-all-clusters
  namespace: argocd
spec:
  generators:
    - clusters: {}
  template:
    metadata:
      # Handle the in-cluster name properly
      name: 'monitoring-{{name}}'
    spec:
      project: monitoring
      source:
        repoURL: https://github.com/myorg/monitoring.git
        targetRevision: HEAD
        path: prometheus-stack
        helm:
          valueFiles:
            - values.yaml
      destination:
        server: '{{server}}'
        namespace: monitoring
      syncPolicy:
        automated:
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

This creates `monitoring-in-cluster`, `monitoring-prod-us-east`, `monitoring-prod-eu-west`, etc.

## Deploying Infrastructure Components to All Clusters

A common use case is deploying shared infrastructure like cert-manager, external-dns, or metrics-server across all clusters.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cert-manager-fleet
  namespace: argocd
spec:
  generators:
    - clusters: {}
  template:
    metadata:
      name: 'cert-manager-{{name}}'
      labels:
        component: cert-manager
        cluster: '{{name}}'
    spec:
      project: infrastructure
      source:
        repoURL: https://charts.jetstack.io
        chart: cert-manager
        targetRevision: v1.14.4
        helm:
          parameters:
            - name: installCRDs
              value: "true"
            - name: prometheus.enabled
              value: "true"
      destination:
        server: '{{server}}'
        namespace: cert-manager
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
---
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: metrics-server-fleet
  namespace: argocd
spec:
  generators:
    - clusters: {}
  template:
    metadata:
      name: 'metrics-server-{{name}}'
    spec:
      project: infrastructure
      source:
        repoURL: https://kubernetes-sigs.github.io/metrics-server
        chart: metrics-server
        targetRevision: 3.12.0
      destination:
        server: '{{server}}'
        namespace: kube-system
      syncPolicy:
        automated:
          selfHeal: true
```

## Using Cluster Labels for Customization

Even when deploying to all clusters, you often need slightly different configurations. Cluster labels let you customize without creating separate ApplicationSets.

First, label your clusters:

```bash
# Add labels to clusters
argocd cluster set prod-us-east-1 \
  --label environment=production \
  --label region=us-east-1 \
  --label cloud=aws

argocd cluster set prod-eu-west-1 \
  --label environment=production \
  --label region=eu-west-1 \
  --label cloud=aws

argocd cluster set dev-cluster \
  --label environment=development \
  --label region=us-east-1 \
  --label cloud=aws
```

Then reference those labels in your ApplicationSet with Go templates:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: external-dns-fleet
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - clusters: {}
  template:
    metadata:
      name: 'external-dns-{{.name}}'
    spec:
      project: infrastructure
      source:
        repoURL: https://github.com/myorg/infra.git
        targetRevision: HEAD
        path: external-dns
        helm:
          valueFiles:
            - values.yaml
            # Environment-specific values
            - 'values-{{index .metadata.labels "environment"}}.yaml'
          parameters:
            - name: aws.region
              value: '{{index .metadata.labels "region"}}'
      destination:
        server: '{{.server}}'
        namespace: external-dns
      syncPolicy:
        automated:
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Deploying a Monitoring Stack Everywhere

Here is a complete example deploying a full monitoring stack to every cluster.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: observability-stack
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - clusters: {}
  template:
    metadata:
      name: 'observability-{{.name}}'
      labels:
        component: observability
        cluster: '{{.name}}'
      annotations:
        notifications.argoproj.io/subscribe.on-sync-failed.slack: infra-alerts
    spec:
      project: observability
      source:
        repoURL: https://github.com/myorg/observability.git
        targetRevision: HEAD
        path: stack
        helm:
          valueFiles:
            - values.yaml
          parameters:
            - name: grafana.ingress.hosts[0]
              value: 'grafana-{{.name}}.internal.example.com'
            - name: prometheus.remoteWrite[0].url
              value: 'https://prometheus.central.example.com/api/v1/write'
            - name: prometheus.externalLabels.cluster
              value: '{{.name}}'
      destination:
        server: '{{.server}}'
        namespace: observability
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
```

## Handling New Cluster Registration

When you register a new cluster with ArgoCD, all cluster-generator-based ApplicationSets automatically detect it and create the corresponding Applications.

```bash
# Register a new cluster
argocd cluster add new-prod-cluster \
  --label environment=production \
  --label region=ap-southeast-1 \
  --label cloud=aws

# Within seconds, the ApplicationSet controller detects the new cluster
# and creates all applications defined by cluster-generator ApplicationSets

# Verify the new applications
argocd app list -l cluster=new-prod-cluster
```

This zero-touch onboarding is one of the biggest advantages of using the cluster generator for fleet management.

## Excluding the Local Cluster

If you want to deploy to all remote clusters but skip the local cluster where ArgoCD runs:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: remote-only-apps
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchExpressions:
            - key: name
              operator: NotIn
              values:
                - in-cluster
  template:
    metadata:
      name: 'remote-agent-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/agents.git
        targetRevision: HEAD
        path: remote-agent
      destination:
        server: '{{server}}'
        namespace: argocd-agents
```

## Progressive Rollout Across All Clusters

Combine the cluster generator with progressive syncs for safe fleet-wide rollouts.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: safe-fleet-rollout
  namespace: argocd
spec:
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: environment
              operator: In
              values:
                - development
        - matchExpressions:
            - key: environment
              operator: In
              values:
                - staging
        - matchExpressions:
            - key: environment
              operator: In
              values:
                - production
          maxUpdate: 1
  generators:
    - clusters: {}
  template:
    metadata:
      name: 'platform-{{name}}'
      labels:
        environment: '{{metadata.labels.environment}}'
    spec:
      project: platform
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        path: deploy
      destination:
        server: '{{server}}'
        namespace: platform
      syncPolicy:
        automated:
          selfHeal: true
```

This configuration deploys to dev clusters first, then staging, then production clusters one at a time.

For fleet-wide monitoring of your ApplicationSet deployments, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-progressive-syncs/view) can provide centralized observability across all clusters, alerting you when any cluster's applications become unhealthy.
