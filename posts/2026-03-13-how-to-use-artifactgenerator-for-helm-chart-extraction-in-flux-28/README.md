# How to Use ArtifactGenerator for Helm Chart Extraction in Flux 2.8

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Artifactgenerator, Helm, GitOps, Kubernetes, Monorepo

Description: Learn how to use the Flux 2.8 ArtifactGenerator to extract Helm charts from monorepos and Git repositories for efficient reconciliation.

---

## Introduction

In Flux 2.8, the ArtifactGenerator resource provides a way to generate artifacts from source repositories with fine-grained control over what gets extracted. When working with monorepos that contain Helm charts alongside application code, ArtifactGenerator lets you extract only the chart directories you need, avoiding unnecessary reconciliation triggered by unrelated file changes. This post walks through using ArtifactGenerator specifically for Helm chart extraction.

## Prerequisites

- A supported Kubernetes cluster (Flux 2.8 supports Kubernetes 1.33, 1.34, and 1.35)
- Flux 2.8 installed on your cluster
- The `ExternalArtifact` feature gate enabled for HelmRelease `chartRef` support
- A Git repository containing Helm charts (ideally a monorepo)
- kubectl configured to access your cluster

## The Problem with Monorepo Helm Charts

When you store Helm charts in a monorepo alongside application code, infrastructure configs, and documentation, the standard GitRepository source triggers reconciliation on every commit -- even if the commit only changed a README file. This leads to unnecessary Helm upgrades and wasted compute resources.

A typical monorepo structure looks like this:

```text
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
    - alias: repo
      kind: GitRepository
      name: monorepo
  artifacts:
    - name: frontend-chart
      originRevision: "@repo"
      copy:
        - from: "@repo/charts/frontend/**"
          to: "@artifact/"
```

This ArtifactGenerator watches the `monorepo` GitRepository and generates an ExternalArtifact named `frontend-chart`. A new artifact revision is generated when the files copied from `charts/frontend/` change.

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
    - alias: repo
      kind: GitRepository
      name: monorepo
  artifacts:
    - name: frontend-chart
      originRevision: "@repo"
      copy:
        - from: "@repo/charts/frontend/**"
          to: "@artifact/"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: backend-chart
  namespace: flux-system
spec:
  sources:
    - alias: repo
      kind: GitRepository
      name: monorepo
  artifacts:
    - name: backend-chart
      originRevision: "@repo"
      copy:
        - from: "@repo/charts/backend/**"
          to: "@artifact/"
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: frontend
  namespace: default
spec:
  interval: 5m
  chartRef:
    kind: ExternalArtifact
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
    kind: ExternalArtifact
    name: backend-chart
    namespace: flux-system
  values:
    replicaCount: 2
    image:
      repository: registry.example.com/backend
      tag: "v3.1.0"
```

With this setup, changing `charts/frontend/values.yaml` only produces a new `frontend-chart` ExternalArtifact revision and triggers the frontend HelmRelease to reconcile. Changes to `charts/backend/` only affect the backend HelmRelease. Changes outside these paths do not produce new chart artifact revisions, so the HelmReleases are not triggered by those commits.

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
    - alias: repo
      kind: GitRepository
      name: monorepo
  artifacts:
    - name: frontend-chart
      originRevision: "@repo"
      copy:
        - from: "@repo/charts/frontend/**"
          to: "@artifact/"
        - from: "@repo/charts/common-lib/**"
          to: "@artifact/charts/common-lib/"
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
    - alias: repo
      kind: GitRepository
      name: monorepo
  artifacts:
    - name: frontend-chart
      originRevision: "@repo"
      copy:
        - from: "@repo/charts/frontend/**"
          to: "@artifact/"
          exclude:
            - "ci/**"
            - "test-values/**"
            - "*.md"
```

This includes all chart files but excludes CI test values, test configurations, and documentation files that should not affect the deployed chart.

## Verifying ArtifactGenerator Status

Check the status of your ArtifactGenerator resources:

```bash
kubectl get artifactgenerators -n flux-system
```

Look for `READY` to be `True`:

```text
NAME              READY   STATUS                  AGE
frontend-chart    True    <status message>         5m
backend-chart     True    <status message>         5m
```

For detailed status:

```bash
kubectl describe artifactgenerator frontend-chart -n flux-system
```

## Monitoring with the Flux Web UI

If you have the Flux Operator Web UI enabled, you can inspect ArtifactGenerator resources and their generated ExternalArtifacts. The Web UI can also expose download actions for ExternalArtifacts listed in an ArtifactGenerator's inventory when the user has the required RBAC permissions.

## Conclusion

ArtifactGenerator in Flux 2.8 solves the monorepo challenge for Helm chart deployments by letting you extract specific chart directories from larger repositories. By scoping artifact generation to only the relevant paths, you eliminate unnecessary reconciliation cycles and reduce the blast radius of commits. This approach is especially valuable for organizations that maintain multiple Helm charts in a single repository and need independent deployment lifecycles for each chart.
