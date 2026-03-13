# How to Use ArtifactGenerator to Combine Multiple Git Sources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, artifactgenerator, multi-source

Description: Learn how to use the Flux ArtifactGenerator to merge manifests from multiple Git repositories into a single deployable artifact.

---

## Introduction

Many organizations distribute Kubernetes manifests across multiple Git repositories. A platform team may maintain shared infrastructure in one repo, while application teams own their deployment configs in separate repos. The Flux ArtifactGenerator allows you to combine content from multiple GitRepository sources into a single artifact, enabling a unified deployment pipeline without consolidating repositories.

This guide demonstrates how to combine multiple Git sources using the ArtifactGenerator, handle file conflicts, and set up proper reconciliation workflows.

## Prerequisites

- A Kubernetes cluster running Flux v2.4 or later
- The Flux Operator installed with ArtifactGenerator CRD
- Multiple Git repositories containing Kubernetes manifests
- `kubectl` and `flux` CLI tools

## Step 1: Define Multiple GitRepository Sources

Create GitRepository resources for each repository you want to combine:

```yaml
# sources.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: shared-platform
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/shared-platform
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/team-alpha-app
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-beta-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/team-beta-app
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: security-policies
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/your-org/security-policies
  ref:
    tag: "v1.5.0"
```

Apply the sources:

```bash
kubectl apply -f sources.yaml
```

## Step 2: Create an ArtifactGenerator for Combined Sources

Combine the sources into a single artifact with proper path isolation:

```yaml
# combined-artifact.yaml
apiVersion: generators.fluxcd.io/v1
kind: ArtifactGenerator
metadata:
  name: production-combined
  namespace: flux-system
spec:
  interval: 10m
  inputs:
    - name: platform
      sourceRef:
        kind: GitRepository
        name: shared-platform
      path: "./production"
      targetPath: "./platform"
    - name: team-alpha
      sourceRef:
        kind: GitRepository
        name: team-alpha-app
      path: "./deploy/production"
      targetPath: "./apps/alpha"
    - name: team-beta
      sourceRef:
        kind: GitRepository
        name: team-beta-app
      path: "./deploy/production"
      targetPath: "./apps/beta"
    - name: policies
      sourceRef:
        kind: GitRepository
        name: security-policies
      path: "./policies/kubernetes"
      targetPath: "./policies"
  output:
    artifact:
      path: "./"
```

The `targetPath` field ensures each source's content lands in a distinct directory, preventing file conflicts.

```bash
kubectl apply -f combined-artifact.yaml
```

## Step 3: Create a Kustomization with Ordered Paths

Deploy the combined artifact using a Kustomization. If you need ordering, create a top-level kustomization.yaml in one of your sources or use multiple Kustomizations:

```yaml
# combined-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform-base
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: production-combined
  path: "./platform"
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: security-policies
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: ArtifactGenerator
    name: production-combined
  path: "./policies"
  prune: true
  dependsOn:
    - name: platform-base
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-alpha
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: production-combined
  path: "./apps/alpha"
  prune: true
  targetNamespace: team-alpha
  dependsOn:
    - name: platform-base
    - name: security-policies
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-beta
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: ArtifactGenerator
    name: production-combined
  path: "./apps/beta"
  prune: true
  targetNamespace: team-beta
  dependsOn:
    - name: platform-base
    - name: security-policies
```

```bash
kubectl apply -f combined-kustomization.yaml
```

## Step 4: Handle Cross-Repository References

When manifests in one source reference resources from another, the combined artifact makes this work naturally. For example, if team-alpha's deployment references a ConfigMap from the platform source, both exist in the same artifact:

```yaml
# In team-alpha-app repo: deploy/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alpha-api
spec:
  template:
    spec:
      containers:
        - name: api
          envFrom:
            - configMapRef:
                name: platform-shared-config  # From shared-platform repo
```

This works because the Kustomization for team-alpha depends on `platform-base`, which deploys the shared ConfigMap first.

## Step 5: Pin Specific Revisions

For production stability, you can pin specific Git revisions per source:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: security-policies
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/your-org/security-policies
  ref:
    tag: "v1.5.0"
```

The ArtifactGenerator regenerates the combined artifact only when any input source produces a new artifact revision, so pinning one source prevents unnecessary regeneration from that source.

## Step 6: Monitor Combined Artifact Status

Track the health of the combined artifact:

```bash
kubectl get artifactgenerator -n flux-system production-combined -o wide
kubectl describe artifactgenerator -n flux-system production-combined
```

Check which input revisions are included:

```bash
kubectl get artifactgenerator -n flux-system production-combined \
  -o jsonpath='{.status.conditions}' | jq .
```

## Conclusion

Combining multiple Git sources with the ArtifactGenerator enables cross-repository deployments without repository consolidation. Each team maintains ownership of their repository while the ArtifactGenerator handles the composition at deployment time. With proper `targetPath` isolation and Kustomization dependency ordering, you can build reliable multi-source deployment pipelines that respect both organizational boundaries and deployment dependencies.
