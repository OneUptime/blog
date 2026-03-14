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

ExternalArtifact is a Flux source type that represents an artifact whose lifecycle is managed outside of Flux. Instead of Flux pulling from a Git repo or OCI registry, an external process (such as a CI pipeline) creates the artifact and updates the ExternalArtifact status with the artifact's location and checksum.

A basic ExternalArtifact looks like this:

```yaml
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ExternalArtifact
metadata:
  name: ci-built-manifests
  namespace: flux-system
spec:
  artifact:
    url: http://source-controller.flux-system.svc/externalartifact/flux-system/ci-built-manifests/latest.tar.gz
    revision: "sha256:abc123def456789"
    digest: "sha256:abc123def456789"
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
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ExternalArtifact
metadata:
  name: build-output
  namespace: flux-system
spec:
  artifact:
    url: http://source-controller.flux-system.svc/externalartifact/flux-system/build-output/latest.tar.gz
    revision: "build-1234"
    digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: production-manifests
  namespace: flux-system
spec:
  sources:
    - kind: ExternalArtifact
      name: build-output
  artifacts:
    - path: "deploy/production/**"
      exclude:
        - "deploy/production/tests/**"
```

The ArtifactGenerator references the ExternalArtifact as its source and applies path filtering to extract only production deployment manifests.

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

      - name: Upload to Flux source controller
        run: |
          kubectl -n flux-system port-forward svc/source-controller 8080:80 &
          curl -X POST http://localhost:8080/externalartifact/flux-system/build-output \
            -F "file=@output/manifests.tar.gz"

      - name: Update ExternalArtifact
        run: |
          kubectl patch externalartifact build-output -n flux-system \
            --type=merge \
            -p "{\"spec\":{\"artifact\":{\"revision\":\"${{ github.sha }}\",\"digest\":\"sha256:${DIGEST}\"}}}"
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
    - kind: ExternalArtifact
      name: build-output
  artifacts:
    - path: "deploy/staging/**"
---
apiVersion: source.extensions.fluxcd.io/v1beta1
kind: ArtifactGenerator
metadata:
  name: production-from-ci
  namespace: flux-system
spec:
  sources:
    - kind: ExternalArtifact
      name: build-output
  artifacts:
    - path: "deploy/production/**"
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: staging-from-ci
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
    kind: ArtifactGenerator
    name: production-from-ci
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

- **Artifact not found**: The URL in the ExternalArtifact spec must be accessible from the source-controller pod. Verify network connectivity.
- **Digest mismatch**: The digest in the spec must match the actual artifact. Ensure your CI pipeline computes the correct SHA256.
- **Path not found**: If the ArtifactGenerator's include paths do not match any files in the artifact, no output artifact is generated. Verify the directory structure inside the tarball.

## Conclusion

Using ExternalArtifact as a source for ArtifactGenerator bridges the gap between external build systems and Flux's GitOps reconciliation. This pattern is valuable for teams that generate manifests in CI pipelines and want Flux to handle the deployment side. The combination of ExternalArtifact for artifact ingestion and ArtifactGenerator for path-based extraction provides a flexible and efficient pipeline for getting externally-built manifests into your cluster.
