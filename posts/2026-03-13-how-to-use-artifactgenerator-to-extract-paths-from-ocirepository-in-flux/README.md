# How to Use ArtifactGenerator to Extract Paths from OCIRepository in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, artifactgenerator, oci, ocirepository

Description: Learn how to use the Flux ArtifactGenerator to extract specific paths from OCI artifacts for targeted Kubernetes deployments.

---

## Introduction

OCI repositories have become a popular way to distribute Kubernetes manifests as container-compatible artifacts. When an OCI artifact contains manifests for multiple environments or applications, you may only need a subset of its content for a particular deployment. The Flux ArtifactGenerator allows you to extract specific paths from an OCIRepository source, creating focused artifacts for targeted Kustomizations.

This guide shows you how to configure ArtifactGenerators that extract specific directories from OCI artifacts, enabling selective deployment from large bundled artifacts.

## Prerequisites

- A Kubernetes cluster with Flux v2.4 or later
- The Flux Operator with ArtifactGenerator CRD support
- An OCI registry with published Kubernetes manifest artifacts
- `kubectl`, `flux`, and `oras` CLI tools installed

## Understanding OCI Artifacts in Flux

Flux can consume OCI artifacts as sources through the OCIRepository resource. These artifacts are typically pushed to registries using the `flux push artifact` command or tools like `oras`. A single OCI artifact might contain a complete set of manifests organized by environment:

```
artifact-contents/
  base/
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    dev/
      kustomization.yaml
      patches.yaml
    staging/
      kustomization.yaml
      patches.yaml
    production/
      kustomization.yaml
      patches.yaml
```

## Step 1: Define the OCIRepository Source

Create an OCIRepository resource pointing to your OCI artifact:

```yaml
# oci-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 10m
  url: oci://ghcr.io/your-org/app-manifests
  ref:
    tag: "latest"
  provider: generic
```

If the registry requires authentication, create credentials first:

```bash
kubectl create secret docker-registry oci-registry-creds \
  -n flux-system \
  --docker-server=ghcr.io \
  --docker-username=your-user \
  --docker-password=your-token
```

Then reference the secret:

```yaml
# oci-source-authenticated.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 10m
  url: oci://ghcr.io/your-org/app-manifests
  ref:
    tag: "v1.2.0"
  secretRef:
    name: oci-registry-creds
```

```bash
kubectl apply -f oci-source-authenticated.yaml
```

## Step 2: Extract Specific Paths with ArtifactGenerator

Create an ArtifactGenerator that extracts only the production overlay and base from the OCI artifact:

```yaml
# production-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: base
      sourceRef:
        kind: OCIRepository
        name: app-manifests
      path: "./base"
      targetPath: "./base"
    - name: production-overlay
      sourceRef:
        kind: OCIRepository
        name: app-manifests
      path: "./overlays/production"
      targetPath: "./overlay"
  output:
    artifact:
      path: "./"
```

```bash
kubectl apply -f production-artifact.yaml
```

## Step 3: Create Per-Environment ArtifactGenerators

For multi-environment setups, create an ArtifactGenerator per environment:

```yaml
# env-artifacts.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: app-staging
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: base
      sourceRef:
        kind: OCIRepository
        name: app-manifests
      path: "./base"
      targetPath: "./base"
    - name: staging-overlay
      sourceRef:
        kind: OCIRepository
        name: app-manifests
      path: "./overlays/staging"
      targetPath: "./overlay"
  output:
    artifact:
      path: "./"
---
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: app-dev
  namespace: flux-system
spec:
  interval: 5m
  inputs:
    - name: base
      sourceRef:
        kind: OCIRepository
        name: app-manifests
      path: "./base"
      targetPath: "./base"
    - name: dev-overlay
      sourceRef:
        kind: OCIRepository
        name: app-manifests
      path: "./overlays/dev"
      targetPath: "./overlay"
  output:
    artifact:
      path: "./"
```

```bash
kubectl apply -f env-artifacts.yaml
```

## Step 4: Deploy with Kustomizations

Wire each extracted artifact to a Kustomization:

```yaml
# kustomizations.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: app-production
  path: "./overlay"
  prune: true
  targetNamespace: production
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-staging
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: app-staging
  path: "./overlay"
  prune: true
  targetNamespace: staging
```

```bash
kubectl apply -f kustomizations.yaml
```

## Step 5: Combine OCI and Git Sources

You can also combine OCI artifact paths with Git repository content. This is useful when your base manifests come from a versioned OCI artifact but environment-specific configs live in Git:

```yaml
# hybrid-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: hybrid-app
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: app-base
      sourceRef:
        kind: OCIRepository
        name: app-manifests
      path: "./base"
      targetPath: "./base"
    - name: env-config
      sourceRef:
        kind: GitRepository
        name: fleet-config
      path: "./envs/production/app"
      targetPath: "./overlay"
  output:
    artifact:
      path: "./"
```

## Step 6: Push OCI Artifacts for Consumption

To create OCI artifacts that work well with path extraction, structure your content clearly and push using the Flux CLI:

```bash
flux push artifact oci://ghcr.io/your-org/app-manifests:v1.2.0 \
  --path=./manifests \
  --source="https://github.com/your-org/app" \
  --revision="v1.2.0/$(git rev-parse HEAD)"
```

## Verification

Check that all ArtifactGenerators are producing artifacts:

```bash
kubectl get artifactgenerators -n flux-system
```

Verify Kustomizations are reconciling from the extracted artifacts:

```bash
flux get kustomizations -A
```

## Conclusion

Extracting specific paths from OCIRepository sources with the ArtifactGenerator gives you fine-grained control over what gets deployed from large OCI artifacts. This pattern is ideal for organizations that publish bundled manifests as OCI artifacts but need environment-specific or component-specific deployments. Combined with the ability to merge OCI and Git sources, you can build flexible deployment pipelines that leverage versioned OCI artifacts for stable base manifests while keeping environment configurations in Git for easy modification.
