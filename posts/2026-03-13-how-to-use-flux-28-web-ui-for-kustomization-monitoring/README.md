# How to Use Flux 2.8 Web UI for Kustomization Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, kustomization, web-ui, monitoring, gitops, kubernetes

Description: Learn how to monitor Kustomization resources using the Flux 2.8 Web UI for real-time visibility into your GitOps reconciliation pipeline.

---

## Introduction

Kustomization resources are the backbone of Flux GitOps workflows. They define what manifests to apply, from which source, and how to reconcile them. Flux 2.8 introduced a web UI that provides a visual dashboard for monitoring these Kustomization resources in real time. This guide explains how to use the Flux Web UI to track Kustomization status, identify reconciliation issues, and understand the dependency chain between your resources.

## Prerequisites

- A Kubernetes cluster (v1.28 or later recommended)
- Flux 2.8 installed with the web UI component enabled
- kubectl configured to access your cluster
- One or more Kustomization resources deployed via Flux

## Enabling the Flux Web UI

If you have not yet enabled the web UI, you can do so by updating your Flux installation. During bootstrap:

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/my-cluster \
  --components-extra=web-ui
```

Once the web UI is running, access it via port-forward:

```bash
kubectl -n flux-system port-forward svc/flux-web-ui 9000:9000
```

## Navigating to the Kustomization View

After opening the web UI at `http://localhost:9000`, click on the "Kustomizations" tab in the left sidebar. This view lists all Kustomization resources managed by Flux across all namespaces.

Each entry in the list displays:

- **Name and namespace** of the Kustomization
- **Status indicator** (Ready, Not Ready, Progressing, Suspended)
- **Source reference** (GitRepository, OCIRepository, or Bucket)
- **Path** within the source that the Kustomization applies
- **Last applied revision** (the Git commit SHA or OCI digest)
- **Reconciliation interval** and last reconciliation time

## Setting Up Sample Kustomizations for Monitoring

To see the monitoring features in action, deploy a multi-layer Kustomization setup:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/app-manifests
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-controllers
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./infrastructure/controllers
  prune: true
  wait: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infra-configs
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: infra-controllers
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./infrastructure/configs
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: infra-configs
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/production
  prune: true
```

This creates three Kustomizations with a dependency chain: `infra-controllers` -> `infra-configs` -> `apps`.

## Understanding the Kustomization Dependency Graph

The Flux Web UI renders the dependency relationships between Kustomizations visually. When you have `dependsOn` fields configured, the UI shows which Kustomizations must reconcile successfully before dependent ones can proceed.

In the example above, the web UI would show:

1. `infra-controllers` reconciles first (no dependencies)
2. `infra-configs` waits for `infra-controllers` to be Ready
3. `apps` waits for `infra-configs` to be Ready

If `infra-controllers` fails, the UI highlights both `infra-configs` and `apps` as blocked, making it immediately clear where the issue originates.

## Inspecting Kustomization Details

Click on any Kustomization to view its detail page. Key sections include:

### Conditions

The conditions panel shows the current state of the Kustomization:

```yaml
conditions:
  - type: Ready
    status: "True"
    reason: ReconciliationSucceeded
    message: "Applied revision: main@sha1:abc123def456"
  - type: Healthy
    status: "True"
    reason: HealthCheckSucceeded
    message: "Health check passed"
```

### Applied Resources Inventory

The web UI displays the list of Kubernetes resources that the Kustomization has applied. This inventory shows each resource's kind, name, namespace, and current state. This is useful for understanding exactly what a Kustomization manages.

### Events Timeline

The events section provides a chronological view of reconciliation events, including:

- Source artifact updates detected
- Reconciliation started and completed events
- Pruning events when resources are removed
- Health check results

## Monitoring Reconciliation Health

The web UI provides several indicators to assess Kustomization health:

- **Reconciliation duration**: How long each reconciliation cycle takes. Increasing durations may indicate growing manifest complexity or API server load.
- **Last applied revision**: Confirms which Git commit or OCI artifact is currently deployed.
- **Prune count**: Shows how many resources were pruned in the last reconciliation, helping you track unintended deletions.

## Filtering Kustomizations

Use the built-in filters to narrow down the Kustomization list:

- **By namespace**: Focus on a specific team or environment namespace
- **By status**: Show only failed or suspended Kustomizations
- **By source**: Filter Kustomizations by their source reference
- **Search**: Text search across Kustomization names

## Troubleshooting with the Web UI

When a Kustomization shows a failed status, the detail view provides actionable information:

- **Validation errors**: The UI displays which manifests failed validation and why
- **Dependency failures**: Shows which upstream Kustomization is blocking reconciliation
- **Health check failures**: Lists which deployed resources failed their health checks
- **Timeout issues**: Indicates if reconciliation exceeded the configured timeout

This information helps you quickly identify whether the issue is in your manifests, your dependencies, or your cluster state.

## Conclusion

The Flux 2.8 Web UI transforms Kustomization monitoring from a CLI-driven workflow into a visual experience. The dependency graph, status indicators, and detailed event timelines make it significantly easier to understand the state of your GitOps pipeline. For teams managing multiple environments with complex dependency chains, the web UI reduces the time spent debugging reconciliation issues and provides a shared dashboard that everyone on the team can reference.
