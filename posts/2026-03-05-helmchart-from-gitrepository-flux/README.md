# How to Set Up HelmChart Source from GitRepository in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmChart, GitRepository, Source Controller

Description: Learn how to configure a HelmChart source that pulls Helm charts directly from a GitRepository in Flux CD, enabling chart development and monorepo workflows.

---

## Introduction

Not all Helm charts are published to a Helm repository or OCI registry. Many teams maintain charts alongside application code in Git repositories, especially in monorepo setups. Flux CD supports pulling Helm charts directly from a GitRepository source, allowing you to use charts stored in any Git-accessible repository without needing to publish them first.

This approach is particularly useful for in-house charts under active development, charts tightly coupled to application code, and organizations that prefer a single source of truth in Git.

## Prerequisites

- A running Kubernetes cluster with Flux CD v2.x installed
- kubectl and the Flux CLI configured
- A Git repository containing one or more Helm charts

## Typical Repository Structure

A Git repository with Helm charts typically follows one of these structures.

Single chart at the root:

```text
my-repo/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    service.yaml
```

Multiple charts in subdirectories:

```text
my-repo/
  charts/
    app-a/
      Chart.yaml
      values.yaml
      templates/
    app-b/
      Chart.yaml
      values.yaml
      templates/
```

Monorepo with application code and charts:

```text
my-repo/
  src/
    main.go
  deploy/
    helm/
      Chart.yaml
      values.yaml
      templates/
```

## Step 1: Create a GitRepository Source

First, define a GitRepository source that points to the Git repository containing your Helm chart.

```yaml
# gitrepository.yaml
# GitRepository source pointing to a repo that contains Helm charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  # The Git repository URL
  url: https://github.com/my-org/my-app
  # Branch, tag, or semver to track
  ref:
    branch: main
  # How often to check for new commits
  interval: 5m
```

For private repositories, add a secret reference.

```bash
# Create a secret with Git credentials
kubectl create secret generic git-creds \
  --namespace flux-system \
  --from-literal=username=flux-bot \
  --from-literal=password=ghp_your_token
```

```yaml
# gitrepository-private.yaml
# GitRepository source for a private repo with authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-private-repo
  namespace: flux-system
spec:
  url: https://github.com/my-org/private-app
  ref:
    branch: main
  interval: 5m
  # Reference the secret with Git credentials
  secretRef:
    name: git-creds
```

## Step 2: Create a HelmChart from the GitRepository

Now create a HelmChart that references the GitRepository. The `spec.chart` field specifies the path to the chart within the repository.

```yaml
# helmchart-from-git.yaml
# HelmChart that pulls a chart from a GitRepository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Path to the chart directory relative to the repository root
  chart: ./deploy/helm
  # sourceRef points to the GitRepository instead of a HelmRepository
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  # How often to check for new chart versions (tied to Git commits)
  interval: 5m
  # Use Revision strategy since we are tracking Git commits, not chart versions
  reconcileStrategy: Revision
```

Apply both resources.

```bash
# Apply the GitRepository and HelmChart resources
kubectl apply -f gitrepository.yaml
kubectl apply -f helmchart-from-git.yaml
```

## Understanding the chart Field for GitRepository Sources

When the source is a GitRepository, the `spec.chart` field is interpreted as a file path relative to the repository root, not a chart name. This is different from HelmRepository-based HelmCharts.

| Source Type | spec.chart meaning | Example |
|-------------|-------------------|---------|
| HelmRepository | Chart name in the repository | `nginx` |
| GitRepository | Path to chart directory | `./charts/nginx` |
| Bucket | Path to chart directory | `./charts/nginx` |

Examples of valid chart paths.

```yaml
# Chart at the repository root
chart: .

# Chart in a subdirectory
chart: ./charts/my-app

# Chart in a nested path
chart: ./deploy/helm/my-app
```

## Reconcile Strategy for Git-Based Charts

For GitRepository-based HelmCharts, the `reconcileStrategy` field determines when Flux considers the chart updated.

- **Revision** (recommended for Git sources) -- A new chart artifact is produced whenever the GitRepository revision changes, meaning any new commit triggers reconciliation
- **ChartVersion** -- A new chart artifact is produced only when the version in Chart.yaml changes

```yaml
# helmchart-revision-strategy.yaml
# HelmChart using Revision reconcile strategy for Git-based charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app-auto-deploy
  namespace: flux-system
spec:
  chart: ./deploy/helm
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  interval: 5m
  # Trigger a new artifact on every Git commit, not just Chart.yaml version changes
  reconcileStrategy: Revision
```

Using `Revision` ensures that changes to templates, values files, or any chart content trigger a redeployment, even if the Chart.yaml version is not bumped.

## Including Values Files

You can specify additional values files from the Git repository to include with the chart.

```yaml
# helmchart-values-files.yaml
# HelmChart with multiple values files from the Git repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  chart: ./deploy/helm
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  interval: 5m
  reconcileStrategy: Revision
  # Include additional values files from the chart directory
  valuesFiles:
    - values.yaml
    - values-production.yaml
```

The paths in `valuesFiles` are relative to the chart directory specified in `spec.chart`.

## Connecting to a HelmRelease

In practice, you often define the HelmChart inline within a HelmRelease. The HelmRelease automatically creates the HelmChart resource.

```yaml
# helmrelease-from-git.yaml
# HelmRelease that implicitly creates a HelmChart from a GitRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      # Path to chart in the Git repository
      chart: ./deploy/helm
      sourceRef:
        kind: GitRepository
        name: my-app-repo
        namespace: flux-system
      interval: 5m
      reconcileStrategy: Revision
  # Override values for this specific release
  values:
    replicaCount: 3
    image:
      tag: latest
```

## Multiple Charts from One GitRepository

A monorepo with multiple charts can be handled by creating multiple HelmChart resources pointing to different paths in the same GitRepository.

```yaml
# helmcharts-monorepo.yaml
# Multiple HelmCharts from a single GitRepository monorepo
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: frontend
  namespace: flux-system
spec:
  chart: ./charts/frontend
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  interval: 5m
  reconcileStrategy: Revision
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: backend
  namespace: flux-system
spec:
  chart: ./charts/backend
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  interval: 5m
  reconcileStrategy: Revision
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: worker
  namespace: flux-system
spec:
  chart: ./charts/worker
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  interval: 5m
  reconcileStrategy: Revision
```

## Verifying the HelmChart

Check that the HelmChart has been fetched successfully from the Git repository.

```bash
# List all HelmChart sources
kubectl get helmchart -n flux-system

# Describe a specific HelmChart for detailed status
kubectl describe helmchart -n flux-system my-app

# Use the Flux CLI to check chart sources
flux get sources chart
```

## Troubleshooting

**Chart not found at path** -- Ensure the `spec.chart` path is correct and that a valid `Chart.yaml` exists at that path in the repository.

```bash
# Verify the GitRepository has been fetched
flux get sources git my-app-repo

# Check the HelmChart conditions for error details
kubectl get helmchart -n flux-system my-app -o jsonpath='{.status.conditions}'
```

**Changes not detected** -- If using `reconcileStrategy: ChartVersion`, ensure you bump the version in `Chart.yaml`. Switch to `Revision` if you want every commit to trigger an update.

## Summary

Using a GitRepository as the source for a HelmChart in Flux CD enables direct chart consumption from Git without publishing to a Helm repository. Set the `spec.chart` field to the directory path within the repo, use `reconcileStrategy: Revision` to track every commit, and leverage `valuesFiles` for environment-specific configuration. This pattern works well for monorepos, in-development charts, and teams that want all their configuration in a single Git repository.
