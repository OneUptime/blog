# How Gitless GitOps Works with Flux CD and OCI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, Container Registry, Artifacts

Description: An exploration of how Flux CD supports OCI artifacts as a source, enabling GitOps workflows that use container registries instead of Git repositories for manifest delivery.

---

GitOps is traditionally defined by having Git as the single source of truth for declarative infrastructure. Flux CD challenges this strict definition by supporting OCI (Open Container Initiative) artifacts as a source type. This means you can push Kubernetes manifests to a container registry and have Flux pull them from there, bypassing Git entirely for the delivery path. The approach is sometimes called "gitless GitOps," though the name is slightly misleading since Git often remains in the development workflow, just not in the delivery path to the cluster.

## Why OCI Artifacts for GitOps

There are several practical reasons to use OCI artifacts instead of Git repositories as the delivery mechanism:

1. Container registries are already part of most organizations' infrastructure, with established authentication, replication, and caching.
2. OCI artifacts are immutable and content-addressable, providing strong guarantees about what is being deployed.
3. Large monorepos can be slow for Flux to clone. OCI artifacts contain only the relevant manifests, making reconciliation faster.
4. Air-gapped environments often have container registries available but may restrict Git access.
5. CI pipelines already push container images. Pushing manifests to the same registry fits naturally into existing workflows.

## How OCI Artifacts Work in Flux CD

Flux CD introduced the `OCIRepository` source type to support pulling artifacts from OCI-compliant registries. The workflow has two sides: pushing artifacts (typically done in CI) and pulling artifacts (done by Flux on the cluster).

```mermaid
flowchart LR
    A[Developer] --> B[Git Repository]
    B --> C[CI Pipeline]
    C --> D[flux push artifact]
    D --> E[OCI Registry]
    E --> F[Flux OCIRepository source]
    F --> G[Kustomization applies manifests]
    G --> H[Kubernetes Cluster]
```

## Pushing Artifacts with the Flux CLI

The `flux push artifact` command packages a directory of Kubernetes manifests into an OCI artifact and pushes it to a container registry. This is typically run in a CI pipeline after manifests are generated or validated.

```bash
# Push the contents of ./deploy/production as an OCI artifact
# The tag uses the Git SHA for traceability
flux push artifact oci://ghcr.io/myorg/app-manifests:$(git rev-parse --short HEAD) \
  --path=./deploy/production \
  --source="$(git config --get remote.origin.url)" \
  --revision="$(git branch --show-current)/$(git rev-parse HEAD)"
```

Key points about this command:

- The `--path` flag specifies the directory containing the manifests to package.
- The `--source` flag records the Git repository URL as metadata on the artifact.
- The `--revision` flag records the Git branch and commit SHA as metadata.
- The artifact is tagged with the short Git SHA, providing traceability back to the source commit.

You can also tag artifacts with semantic versions.

```bash
# Push with a semantic version tag
flux push artifact oci://ghcr.io/myorg/app-manifests:1.2.3 \
  --path=./deploy/production \
  --source="$(git config --get remote.origin.url)" \
  --revision="main/$(git rev-parse HEAD)"
```

## Pulling Artifacts with OCIRepository

On the cluster side, you configure an `OCIRepository` source instead of a `GitRepository`.

```yaml
# OCIRepository source that pulls manifests from a container registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/myorg/app-manifests
  ref:
    # Pull the latest semver tag
    semver: ">=1.0.0"
  provider: generic
```

The `ref` field supports multiple strategies.

```yaml
# Pull a specific tag
ref:
  tag: "1.2.3"

# Pull the latest semver-compatible tag
ref:
  semver: ">=1.0.0"

# Pull by digest for maximum immutability
ref:
  digest: "sha256:abc123..."
```

## Connecting OCIRepository to a Kustomization

Once the OCIRepository is defined, you reference it from a Kustomization just as you would a GitRepository.

```yaml
# Kustomization that applies manifests from the OCI artifact
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  path: "."
  prune: true
  sourceRef:
    kind: OCIRepository
    name: app-manifests
  targetNamespace: production
```

Since the OCI artifact was created from a specific directory, the `path` is typically `.` (root of the artifact). The artifact contains only the manifests that were packaged, not the entire repository.

## Authentication with Container Registries

Flux needs credentials to pull from private registries. You can use Kubernetes secrets or cloud provider authentication.

```bash
# Create a Docker registry secret for Flux to use
kubectl create secret docker-registry oci-creds \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=flux \
  --docker-password=$GITHUB_TOKEN
```

Reference the secret in the OCIRepository.

```yaml
# OCIRepository with authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/myorg/app-manifests
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: oci-creds
```

For cloud-hosted registries like AWS ECR, GCP Artifact Registry, or Azure Container Registry, Flux supports native provider authentication.

```yaml
# Using AWS ECR with native provider authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://123456789.dkr.ecr.us-east-1.amazonaws.com/app-manifests
  ref:
    tag: latest
  provider: aws
```

## Listing and Inspecting OCI Artifacts

The Flux CLI provides commands to inspect artifacts stored in a registry.

```bash
# List tags for an OCI artifact
flux list artifact oci://ghcr.io/myorg/app-manifests

# Pull and inspect an artifact locally
flux pull artifact oci://ghcr.io/myorg/app-manifests:1.2.3 \
  --output=./local-manifests
```

The `flux pull artifact` command downloads the artifact contents to a local directory, which is useful for debugging or verifying what Flux will apply to the cluster.

## CI Pipeline Integration

A typical CI pipeline that uses OCI artifacts looks like this.

```bash
#!/bin/bash
# CI pipeline script for building and pushing OCI artifacts

# Step 1: Run tests and validations
kubectl kustomize ./deploy/production > /dev/null

# Step 2: Push the manifests as an OCI artifact
flux push artifact oci://ghcr.io/myorg/app-manifests:${CI_COMMIT_SHORT_SHA} \
  --path=./deploy/production \
  --source="${CI_REPOSITORY_URL}" \
  --revision="${CI_COMMIT_BRANCH}/${CI_COMMIT_SHA}"

# Step 3: Tag with semver if this is a release
if [ -n "$CI_COMMIT_TAG" ]; then
  flux tag artifact oci://ghcr.io/myorg/app-manifests:${CI_COMMIT_SHORT_SHA} \
    --tag="${CI_COMMIT_TAG}"
fi
```

The `flux tag artifact` command adds additional tags to an existing artifact without re-uploading it. This is useful for promoting artifacts from staging to production by adding a production-ready tag.

## OCI Artifacts for Helm Charts

Flux also supports pulling Helm charts from OCI registries using the HelmRepository source type with the `type: oci` field.

```yaml
# HelmRepository pointing to an OCI registry for Helm charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  interval: 1h
  url: oci://ghcr.io/myorg/charts
```

This is distinct from the OCIRepository source. HelmRepository with `type: oci` is specifically for Helm charts, while OCIRepository is for raw Kubernetes manifests packaged as OCI artifacts.

## When to Use OCI Artifacts vs Git

OCI artifacts are not a replacement for Git in every scenario. Git remains the better choice when you want pull request workflows, branch-based environments, or when your manifests are small and the repository is not a bottleneck.

OCI artifacts make more sense when you have large repositories that are slow to clone, air-gapped environments with registry mirroring, or when you want the delivery mechanism to match your container image pipeline.

## Conclusion

Flux CD's OCI support decouples the concept of GitOps from the Git transport layer. You can keep Git as your development and review platform while using OCI artifacts as the delivery mechanism to your clusters. The `flux push artifact`, `flux pull artifact`, and `flux tag artifact` commands provide a straightforward CLI for managing artifacts, while `OCIRepository` on the cluster side integrates seamlessly with existing Kustomization and HelmRelease resources. This gives teams flexibility to choose the delivery path that best fits their infrastructure.
