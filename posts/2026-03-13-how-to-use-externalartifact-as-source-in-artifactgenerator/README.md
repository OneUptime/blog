# How to Use ExternalArtifact as Source in ArtifactGenerator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Artifactgenerator, Externalartifact, GitOps, Kubernetes, OCI

Description: Learn how to use ExternalArtifact resources as source inputs for ArtifactGenerator in Flux to integrate external artifact sources.

---

## Introduction

While most Flux workflows use GitRepository or OCIRepository as sources, there are scenarios where artifacts come from external systems that Flux does not natively integrate with. The ExternalArtifact resource in Flux provides a way to reference artifacts produced outside of Flux's source controllers, and you can use these as inputs to ArtifactGenerator for further processing. This post explains how to configure ExternalArtifact as a source for ArtifactGenerator and covers practical use cases.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- Flux 2.8 installed on your cluster
- An external system producing artifacts (CI pipeline, build system, etc.)
- kubectl configured to access your cluster

## What is ExternalArtifact?

ExternalArtifact is a Flux source type that represents an artifact whose lifecycle is managed outside of Flux. Instead of Flux pulling from a Git repo or OCI registry, an external process (such as a CI pipeline or custom controller) creates the artifact and updates the ExternalArtifact status with the artifact's location and checksum.

A basic ExternalArtifact looks like this after the external controller has produced an artifact:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: ExternalArtifact
metadata:
  name: ci-built-manifests
  namespace: flux-system
spec:
  sourceRef:
    apiVersion: ci.example.com/v1
    kind: Build
    name: ci-built-manifests
status:
  artifact:
    digest: "sha256:abc123def456789"
    lastUpdateTime: "2026-03-13T12:00:00Z"
    path: ci/flux-system/ci-built-manifests/abc123def456789.tar.gz
    revision: "build-1234@sha256:abc123def456789"
    size: 20914
    url: http://artifact-server.flux-system.svc.cluster.local/ci/flux-system/ci-built-manifests/abc123def456789.tar.gz
```

The external process updates this resource when new artifacts are available, and Flux picks up the changes.

## Why Combine ExternalArtifact with ArtifactGenerator?

Using ExternalArtifact directly with a Kustomization or HelmRelease works for simple cases. However, ArtifactGenerator adds value when you need to:

- Extract specific paths from an externally-produced artifact
- Combine external artifacts with other sources
- Apply path-based filtering to narrow down what gets deployed
- Transform the artifact structure before consumption

## Configuring ArtifactGenerator with ExternalArtifact Source

Here is how to set up ArtifactGenerator to consume an ExternalArtifact:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: ExternalArtifact
metadata:
  name: build-output
  namespace: flux-system
spec:
  sourceRef:
    apiVersion: ci.example.com/v1
    kind: Build
    name: build-output
status:
  artifact:
    digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    lastUpdateTime: "2026-03-13T12:00:00Z"
    path: ci/flux-system/build-output/e3b0c442.tar.gz
    revision: "build-1234@sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    size: 1024
    url: http://artifact-server.flux-system.svc.cluster.local/ci/flux-system/build-output/e3b0c442.tar.gz
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: production-manifests
  namespace: flux-system
spec:
  sources:
    - alias: build
      kind: ExternalArtifact
      name: build-output
  artifacts:
    - name: production-manifests
      originRevision: "@build"
      copy:
        - from: "@build/deploy/production/**"
          to: "@artifact/deploy/production/"
          exclude:
            - "**/tests/**"
```

The ArtifactGenerator references the ExternalArtifact as its source and generates a new ExternalArtifact named `production-manifests` containing only the production deployment manifests.

## CI Pipeline Integration

The typical workflow involves a CI pipeline that builds and packages manifests, then updates the ExternalArtifact resource. Here is an example using a GitHub Actions workflow:

```yaml
# .github/workflows/build-manifests.yaml

name: Build and Publish Manifests
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build manifests
        run: |
          # Run your manifest generation (kustomize build, helm template, etc.)
          mkdir -p output/deploy/production
          mkdir -p output/deploy/staging
          kustomize build overlays/production -o output/deploy/production/
          kustomize build overlays/staging -o output/deploy/staging/

      - name: Package artifact
        run: |
          cd output
          tar -czf manifests.tar.gz deploy/
          DIGEST=$(sha256sum manifests.tar.gz | cut -d' ' -f1)
          echo "DIGEST=${DIGEST}" >> $GITHUB_ENV

      - name: Upload artifact
        run: |
          curl -X PUT "https://artifacts.example.com/flux-system/build-output/${GITHUB_SHA}.tar.gz" \
            --upload-file output/manifests.tar.gz

      - name: Update ExternalArtifact status
        run: |
          kubectl patch externalartifact build-output -n flux-system \
            --subresource=status \
            --type=merge \
            -p "{\"status\":{\"artifact\":{\"url\":\"https://artifacts.example.com/flux-system/build-output/${{ github.sha }}.tar.gz\",\"revision\":\"${{ github.sha }}@sha256:${DIGEST}\",\"digest\":\"sha256:${DIGEST}\",\"path\":\"flux-system/build-output/${{ github.sha }}.tar.gz\",\"lastUpdateTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}"
```

## Multi-Environment Extraction

A single ExternalArtifact can contain manifests for multiple environments. Use separate ArtifactGenerators to extract each environment:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: staging-from-ci
  namespace: flux-system
spec:
  sources:
    - alias: build
      kind: ExternalArtifact
      name: build-output
  artifacts:
    - name: staging-manifests
      originRevision: "@build"
      copy:
        - from: "@build/deploy/staging/**"
          to: "@artifact/deploy/staging/"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: production-from-ci
  namespace: flux-system
spec:
  sources:
    - alias: build
      kind: ExternalArtifact
      name: build-output
  artifacts:
    - name: production-manifests
      originRevision: "@build"
      copy:
        - from: "@build/deploy/production/**"
          to: "@artifact/deploy/production/"
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ExternalArtifact
    name: staging-manifests
  path: ./deploy/staging
  prune: true
  targetNamespace: staging
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ExternalArtifact
    name: production-manifests
  path: ./deploy/production
  prune: true
  targetNamespace: production
```

## Verifying the Setup

Check that the ExternalArtifact is ready:

```bash
kubectl get externalartifacts -n flux-system
```

Verify the ArtifactGenerator has processed the external artifact:

```bash
kubectl get artifactgenerators -n flux-system
```

Check events for any issues:

```bash
kubectl events --for externalartifact/build-output -n flux-system
kubectl events --for artifactgenerator/production-from-ci -n flux-system
```

## Error Handling

Common issues when using ExternalArtifact with ArtifactGenerator:

- **Artifact not found**: The URL in the ExternalArtifact status must be accessible from the controller pod that fetches the artifact. Verify network connectivity.
- **Digest mismatch**: The digest in the status must match the actual artifact. Ensure your CI pipeline computes the correct SHA256.
- **Path not found**: If the ArtifactGenerator's copy paths do not match any files in the artifact, the build can fail. Verify the directory structure inside the tarball.

## Conclusion

Using ExternalArtifact as a source for ArtifactGenerator bridges the gap between external build systems and Flux's GitOps reconciliation. This pattern is valuable for teams that generate manifests in CI pipelines and want Flux to handle the deployment side. The combination of ExternalArtifact for artifact ingestion and ArtifactGenerator for path-based extraction provides a flexible and efficient pipeline for getting externally-built manifests into your cluster.
