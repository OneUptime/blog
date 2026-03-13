# How to Use ArtifactGenerator for Source Composition in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, artifactgenerator, source-composition

Description: Learn how to use the Flux ArtifactGenerator to compose multiple sources into a single artifact for unified Kustomization deployments.

---

## Introduction

In complex GitOps setups, your deployment manifests often come from multiple sources: different Git repositories, OCI artifacts, or Helm charts. Traditionally, you would need separate Kustomizations for each source, making it difficult to manage dependencies and ordering. The Flux ArtifactGenerator solves this by allowing you to compose multiple sources into a single unified artifact that can be consumed by a single Kustomization.

This guide shows you how to use the ArtifactGenerator custom resource to combine sources, configure layering, and deploy composed artifacts through Flux.

## Prerequisites

- A Kubernetes cluster with Flux installed (v2.4 or later)
- The Flux Operator installed with ArtifactGenerator CRD support
- `kubectl` and `flux` CLI tools
- At least two source repositories or OCI artifacts to compose

## Understanding Source Composition

Source composition is the process of merging content from multiple Flux sources into a single artifact. The ArtifactGenerator creates a new artifact by pulling content from each input source, overlaying them in a specified order, and producing a combined output that Kustomizations can reference.

This is useful when you need to combine base configurations from a platform team repository with application-specific overlays from a development team repository.

## Step 1: Set Up Your Input Sources

First, define the individual sources that you want to compose. Here is a platform base configuration source:

```yaml
# platform-base-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-base
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/platform-base
  ref:
    branch: main
```

And an application overlay source:

```yaml
# app-overlay-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-overlay
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/app-overlays
  ref:
    branch: main
```

Apply both sources:

```bash
kubectl apply -f platform-base-source.yaml
kubectl apply -f app-overlay-source.yaml
```

## Step 2: Create the ArtifactGenerator

Define an ArtifactGenerator that composes the two sources. The order of inputs matters as later sources overlay earlier ones:

```yaml
# composed-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: app-composed
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: base
      sourceRef:
        kind: GitRepository
        name: platform-base
      path: "./kubernetes/base"
    - name: overlay
      sourceRef:
        kind: GitRepository
        name: app-overlay
      path: "./overlays/production"
  output:
    artifact:
      path: "./"
```

Apply the ArtifactGenerator:

```bash
kubectl apply -f composed-artifact.yaml
```

## Step 3: Verify Artifact Generation

Check that the ArtifactGenerator has successfully composed the sources:

```bash
kubectl get artifactgenerator -n flux-system app-composed
```

Inspect the status for details about the generated artifact:

```bash
kubectl describe artifactgenerator -n flux-system app-composed
```

The status should show a ready condition and the URL of the generated artifact stored in the source-controller's artifact storage.

## Step 4: Reference the Composed Artifact in a Kustomization

Create a Kustomization that consumes the composed artifact:

```yaml
# app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-deployment
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: app-composed
  path: "./"
  prune: true
  targetNamespace: production
  wait: true
  timeout: 5m
```

Apply the Kustomization:

```bash
kubectl apply -f app-kustomization.yaml
```

## Step 5: Implement Layered Composition

For more complex scenarios, you can compose multiple layers with specific path mappings:

```yaml
# multi-layer-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: multi-layer-app
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: crds
      sourceRef:
        kind: GitRepository
        name: platform-base
      path: "./crds"
    - name: namespaces
      sourceRef:
        kind: GitRepository
        name: platform-base
      path: "./namespaces"
    - name: base-services
      sourceRef:
        kind: GitRepository
        name: platform-base
      path: "./services/base"
    - name: app-config
      sourceRef:
        kind: GitRepository
        name: app-overlay
      path: "./config"
    - name: app-deploy
      sourceRef:
        kind: GitRepository
        name: app-overlay
      path: "./deploy/production"
  output:
    artifact:
      path: "./"
```

This creates a layered artifact with CRDs, namespaces, base services, application configuration, and deployment manifests all composed in the correct order.

## Step 6: Handle Composition Conflicts

When files with the same name exist in multiple inputs, the last input takes precedence. To manage this explicitly, use distinct output path mappings:

```yaml
spec:
  inputs:
    - name: base
      sourceRef:
        kind: GitRepository
        name: platform-base
      path: "./kubernetes"
      targetPath: "./base"
    - name: overlay
      sourceRef:
        kind: GitRepository
        name: app-overlay
      path: "./kubernetes"
      targetPath: "./overlay"
```

Then use a kustomization.yaml in your overlay that references the base directory, preserving the Kustomize overlay pattern within the composed artifact.

## Monitoring and Debugging

Monitor ArtifactGenerator reconciliation with events:

```bash
kubectl events -n flux-system --for artifactgenerator/app-composed
```

If the artifact generation fails, check which input source is causing the issue:

```bash
flux get sources git -n flux-system
flux get sources oci -n flux-system
```

## Conclusion

The ArtifactGenerator for source composition enables you to combine multiple Flux sources into a single artifact, simplifying your Kustomization topology and making cross-repository dependencies explicit. By layering platform base configurations with application overlays, you can maintain clean separation of concerns in your Git repositories while deploying them as a unified set of manifests. This pattern is particularly valuable for platform engineering teams that provide base configurations consumed by multiple application teams.
