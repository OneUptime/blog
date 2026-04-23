# Rancher Fleet vs ArgoCD: GitOps Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, ArgoCD, GitOps, Kubernetes, Comparison

Description: A detailed comparison of Rancher Fleet and ArgoCD for GitOps-based Kubernetes deployments, covering features, scalability, and multi-cluster support.

## Overview

GitOps has become the standard approach for managing Kubernetes workloads at scale. Rancher Fleet and ArgoCD are two leading GitOps tools, each with distinct architectures and strengths. Fleet is optimized for very large multi-cluster deployments, while ArgoCD excels at application delivery with a rich UI and powerful sync controls. This guide compares them to help you choose the right tool.

## What Is Rancher Fleet?

Fleet is a GitOps tool built by SUSE Rancher, designed from the ground up for managing large numbers of Kubernetes clusters. It uses a bundle-based model where Git repositories are continuously synced to target clusters. Fleet is tightly integrated with Rancher and is particularly strong in edge and multi-cluster scenarios.

## What Is ArgoCD?

ArgoCD is a declarative GitOps continuous delivery tool for Kubernetes. It monitors Git repositories for changes and automatically applies them to target clusters. ArgoCD features a rich web UI, multi-cluster support, sync waves, health assessments, and a powerful Application API.

## Feature Comparison

| Feature | Fleet | ArgoCD |
|---|---|---|
| Multi-cluster Scale | Designed for very large fleets | Multi-cluster with controller sharding/scaling |
| Web UI | Basic | Rich / Advanced |
| Sync Model | Two-stage pull | Controller pulls from Git and applies to clusters |
| Helm Support | Yes | Yes |
| Kustomize Support | Yes | Yes |
| Raw YAML Support | Yes | Yes |
| SSO Integration | Via Rancher | Yes (bundled Dex or external OIDC) |
| RBAC | Via Rancher | Built-in |
| Notifications | Limited | Yes (Notifications controller) |
| Application Health | Basic | Advanced |
| Sync Waves | No | Yes |
| Rollback | Via Git revert / Helm rollback | Yes |
| App of Apps Pattern | Partial (multiple bundles per repo) | Yes |
| Edge Support | Strong (agent-based) | General-purpose |
| Air-gap Support | Yes | Yes |
| Drift Detection | Yes | Yes |
| Progressive Delivery | Limited (cluster rolloutStrategy) | Limited (hooks / experimental progressive syncs; use Argo Rollouts for canaries) |

## Architecture

### Fleet Architecture

```text
Git Repository
      |
      v
Fleet Controller
      |
   +--+--+
   |     |
Fleet   Fleet
Agent   Agent
(Cluster 1)  (Cluster 2..N)
```

Fleet uses a bundle system. Each bundle maps to a directory in Git and can target clusters based on labels, cluster groups, or cluster names.

### ArgoCD Architecture

```text
Git Repository
      |
      v
ArgoCD Repo Server
      |
      v
ArgoCD Application Controller
      |
   +--+--+
   |     |
Cluster  Cluster
1        2
```

ArgoCD manages applications as Kubernetes Custom Resources (Application CRD). Each Application maps a Git source to a destination cluster/namespace. The repo server renders manifests, the application controller reconciles them to clusters, and the API server exposes the UI and API.

## Defining GitOps Resources

### Fleet GitRepo

```yaml
# Fleet GitRepo resource - targets clusters with label env=production

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/my-app-config
  branch: main
  targets:
    - name: production
      clusterSelector:
        matchLabels:
          env: production
  paths:
    - manifests/
```

### ArgoCD Application

```yaml
# ArgoCD Application resource
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app-config
    targetRevision: HEAD
    path: manifests/
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Multi-cluster Scale

Fleet is the stronger fit for very large multi-cluster deployments. SUSE Rancher documents Fleet as GitOps at scale and says it is designed to manage up to a million clusters. Its architecture is a two-stage pull model: the Fleet controller pulls from Git, and cluster agents pull from the Fleet controller.

ArgoCD can also manage multiple clusters, but its scaling guidance focuses on tuning and sharding the control plane as footprint grows. For large deployments, Argo CD can shard clusters across multiple application-controller replicas.

## UI and Observability

ArgoCD provides one of the best GitOps UIs available, with a real-time graph view of application resources, diff visualization, sync status per resource, and detailed event logs.

Fleet's UI is basic and integrated into the Rancher UI. For sophisticated observability, teams typically rely on Rancher monitoring and external tooling.

## Sync Waves and Ordering

ArgoCD supports sync waves via annotations, allowing precise ordering of resource creation:

```yaml
# Deploy database before application
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"   # Database deploys first
```

Fleet provides ordering through bundle dependencies rather than fine-grained sync waves.

## When to Choose Fleet

- You are managing dozens to very large fleets of clusters (especially edge)
- You are already using Rancher
- Simplicity and tight Rancher integration are priorities
- Edge and disconnected environments are targets

## When to Choose ArgoCD

- You need a rich UI and advanced observability
- Sync waves, hooks, and fine-grained sync control are important
- You use ArgoCD Notifications for deployment alerts
- You want an application-centric GitOps workflow and can scale the Argo CD control plane for your footprint
- Your team is not using Rancher

## Conclusion

Fleet and ArgoCD are both excellent GitOps tools that excel in different scenarios. Fleet's standout strength is large-scale multi-cluster operation, especially in Rancher environments. ArgoCD's standout strength is depth - rich UI, sync waves, health assessment, and a mature application delivery API. Many organizations use ArgoCD for application delivery and Fleet for cluster configuration management, using the two tools complementarily.
