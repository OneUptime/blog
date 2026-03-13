# How to Use ArtifactGenerator for Helm Chart Extraction in Flux 2.8

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, artifactgenerator, helm, gitops, kubernetes, monorepo

Description: Learn how to use the Flux 2.8 ArtifactGenerator to extract Helm charts from monorepos and Git repositories for efficient reconciliation.

---

## Introduction

In Flux 2.8, the ArtifactGenerator resource provides a way to generate artifacts from source repositories with fine-grained control over what gets extracted. When working with monorepos that contain Helm charts alongside application code, ArtifactGenerator lets you extract only the chart directories you need, avoiding unnecessary reconciliation triggered by unrelated file changes. This post walks through using ArtifactGenerator specifically for Helm chart extraction.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- Flux 2.8 installed on your cluster
- A Git repository containing Helm charts (ideally a monorepo)
- kubectl configured to access your cluster

## The Problem with Monorepo Helm Charts

When you store Helm charts in a monorepo alongside application code, infrastructure configs, and documentation, the standard GitRepository source triggers reconciliation on every commit -- even if the commit only changed a README file. This leads to unnecessary Helm upgrades and wasted compute resources.

A typical monorepo structure looks like this:

```
my-monorepo/
  apps/
    frontend/
      src/
      Dockerfile
    backend/
      src/
      Dockerfile
  charts/
    frontend/
      Chart.yaml
      values.yaml
      templates/
    backend/
      Chart.yaml
      values.yaml
      templates/
  docs/
  scripts/
```

With a standard GitRepository, any change anywhere in this repo triggers all Kustomizations and HelmReleases to reconcile.

## Configuring ArtifactGenerator for Chart Extraction

The ArtifactGenerator lets you define which paths to include in the generated artifact. For Helm chart extraction, you specify the chart directory:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: frontend-chart
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: monorepo
  artifacts:
    - path: "charts/frontend/**"
```

This ArtifactGenerator watches the `monorepo` GitRepository but only generates a new artifact when files under `charts/frontend/` change.

## Setting Up the Full Pipeline

Here is the complete setup, from GitRepository source to HelmRelease, using ArtifactGenerator for chart extraction:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/monorepo
  ref:
    branch: main
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: frontend-chart
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: monorepo
  artifacts:
    - path: "charts/frontend/**"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: backend-chart
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: monorepo
  artifacts:
    - path: "charts/backend/**"
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: frontend
  namespace: default
spec:
  interval: 5m
  chartRef:
    kind: ArtifactGenerator
    name: frontend-chart
    namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: registry.example.com/frontend
      tag: "v1.2.0"
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: backend
  namespace: default
spec:
  interval: 5m
  chartRef:
    kind: ArtifactGenerator
    name: backend-chart
    namespace: flux-system
  values:
    replicaCount: 2
    image:
      repository: registry.example.com/backend
      tag: "v3.1.0"
```

With this setup, changing `charts/frontend/values.yaml` only triggers the frontend HelmRelease to reconcile. Changes to `charts/backend/` only affect the backend HelmRelease. Changes outside these paths trigger no HelmRelease reconciliation at all.

## Handling Shared Chart Dependencies

If your charts share common templates or library charts, you can include multiple paths in the ArtifactGenerator:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: frontend-chart
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: monorepo
  artifacts:
    - path: "charts/frontend/**"
    - path: "charts/common-lib/**"
```

This ensures that changes to the shared library chart also trigger a new artifact generation for the frontend chart.

## Excluding Files from the Artifact

You can exclude non-essential files from the generated artifact to keep it lean:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: frontend-chart
  namespace: flux-system
spec:
  sources:
    - kind: GitRepository
      name: monorepo
  artifacts:
    - path: "charts/frontend/**"
      exclude:
        - "charts/frontend/ci/**"
        - "charts/frontend/test-values/**"
        - "charts/frontend/*.md"
```

This includes all chart files but excludes CI test values, test configurations, and documentation files that should not affect the deployed chart.

## Verifying ArtifactGenerator Status

Check the status of your ArtifactGenerator resources:

```bash
kubectl get artifactgenerators -n flux-system
```

Expected output:

```
NAME              READY   STATUS                  AGE
frontend-chart    True    Artifact generated       5m
backend-chart     True    Artifact generated       5m
```

For detailed status:

```bash
kubectl describe artifactgenerator frontend-chart -n flux-system
```

## Monitoring with the Flux Web UI

If you have the Flux 2.8 Web UI enabled, ArtifactGenerator resources appear under their own tab. You can see which source each generator references, the included paths, and when the last artifact was generated.

## Conclusion

ArtifactGenerator in Flux 2.8 solves the monorepo challenge for Helm chart deployments by letting you extract specific chart directories from larger repositories. By scoping artifact generation to only the relevant paths, you eliminate unnecessary reconciliation cycles and reduce the blast radius of commits. This approach is especially valuable for organizations that maintain multiple Helm charts in a single repository and need independent deployment lifecycles for each chart.
