# How to Understand Flux CD Sources and Artifacts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Source Controller, Artifacts, OCI

Description: A comprehensive guide to understanding how Flux CD's source-controller fetches, packages, and serves artifacts from Git repositories, Helm repositories, OCI registries, and S3-compatible storage.

---

## What Are Sources in Flux CD?

Sources are Flux CD custom resources that define where your desired Kubernetes state lives outside the cluster. The source-controller watches these resources, fetches content from the specified locations, and packages them into artifacts that other Flux controllers can consume.

Think of the source-controller as a supply chain manager. It knows where to get the raw materials (your manifests, charts, and configurations), validates them, and stores them in a consistent format for downstream consumers.

## Source Types

Flux CD supports several source types, each designed for a different storage backend:

```mermaid
graph TD
    SC[Source Controller] --> GR[GitRepository]
    SC --> OCR[OCIRepository]
    SC --> HR[HelmRepository]
    SC --> HC[HelmChart]
    SC --> B[Bucket]

    GR -->|fetches from| Git[Git Servers]
    OCR -->|fetches from| OCI[OCI Registries]
    HR -->|fetches from| Helm[Helm Chart Repos]
    HC -->|fetches from| HelmSource[Helm/Git/OCI]
    B -->|fetches from| S3[S3 / GCS / Azure Blob]
```

### GitRepository

The most common source type. It clones a Git repository and makes its contents available as an artifact.

```yaml
# A GitRepository source that tracks the main branch
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 5m              # How often to check for new commits
  url: https://github.com/my-org/webapp
  ref:
    branch: main             # Can also use tag, semver, or commit
  ignore: |
    # Exclude non-deployment files from the artifact
    /*
    !/deploy
```

You can also track specific tags or use semantic versioning:

```yaml
# Track the latest semver tag matching a range
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: webapp-releases
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/webapp
  ref:
    semver: ">=1.0.0 <2.0.0"  # Picks the highest matching tag
```

### OCIRepository

Fetches artifacts stored in OCI-compliant container registries. This is useful when you want to publish deployment manifests as container images.

```yaml
# An OCIRepository source pulling manifests from a container registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: webapp-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/my-org/webapp-deploy
  ref:
    tag: latest
  provider: generic          # Use 'aws', 'azure', or 'gcp' for cloud registries
```

### HelmRepository

Points to a Helm chart repository, either HTTP/HTTPS-based or OCI-based.

```yaml
# A traditional HTTPS Helm repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h               # Chart repos change less frequently
  url: https://charts.bitnami.com/bitnami
  type: default               # Use 'oci' for OCI-based helm repos
```

```yaml
# An OCI-based Helm repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo-oci
  namespace: flux-system
spec:
  interval: 1h
  url: oci://ghcr.io/stefanprodan/charts
  type: oci
```

### HelmChart

A HelmChart is a source that the helm-controller uses. It can pull a chart from a HelmRepository, a GitRepository, or a Bucket.

```yaml
# A HelmChart that fetches a specific chart and version
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 10m
  chart: podinfo              # Chart name in the repository
  version: ">=6.0.0 <7.0.0"  # Semver range
  sourceRef:
    kind: HelmRepository
    name: podinfo-oci
  reconcileStrategy: ChartVersion  # Reconcile when chart version changes
```

### Bucket

Fetches artifacts from S3-compatible storage, Google Cloud Storage, or Azure Blob Storage.

```yaml
# A Bucket source fetching from AWS S3
apiVersion: source.toolkit.fluxcd.io/v1
kind: Bucket
metadata:
  name: config-bucket
  namespace: flux-system
spec:
  interval: 10m
  provider: aws
  bucketName: my-gitops-configs
  endpoint: s3.amazonaws.com
  region: us-east-1
  secretRef:
    name: s3-credentials
```

## What Are Artifacts?

An artifact is the output of a source reconciliation. When the source-controller successfully fetches content from a source, it packages it into a tarball and stores it locally. The artifact metadata is recorded in the source resource's status.

```mermaid
graph LR
    A[Git Repository] -->|clone/pull| B[Source Controller]
    B -->|package| C[Tarball Artifact]
    C -->|stored at| D[Local HTTP Server]
    D -->|served to| E[Kustomize Controller]
    D -->|served to| F[Helm Controller]
```

The artifact contains:

- **Revision** - A unique identifier, such as `main@sha1:abc123def` for Git or `6.1.0` for Helm charts.
- **Checksum** - A SHA-256 digest of the artifact tarball for integrity verification.
- **URL** - A local HTTP URL where the artifact can be downloaded by other controllers.
- **Last update time** - When the artifact was last updated.

You can inspect artifacts by looking at the source status:

```bash
# View the artifact details of a GitRepository
kubectl get gitrepository webapp -n flux-system -o jsonpath='{.status.artifact}' | jq .

# Example output:
# {
#   "revision": "main@sha1:a1b2c3d4e5f6",
#   "digest": "sha256:9f86d081884c...",
#   "url": "http://source-controller.flux-system.svc.cluster.local./gitrepository/flux-system/webapp/latest.tar.gz",
#   "lastUpdateTime": "2026-03-05T10:30:00Z"
# }
```

## How Artifacts Flow Between Controllers

The artifact flow is a key architectural concept in Flux CD. The source-controller produces artifacts, and the kustomize-controller and helm-controller consume them.

```mermaid
sequenceDiagram
    participant Git as Git Repository
    participant SC as Source Controller
    participant Store as Artifact Storage
    participant KC as Kustomize Controller
    participant Cluster as Kubernetes API

    SC->>Git: Fetch latest commit
    Git-->>SC: Repository contents
    SC->>Store: Package and store artifact
    SC->>SC: Update GitRepository status.artifact
    KC->>KC: Detect artifact revision change
    KC->>Store: Download artifact tarball
    Store-->>KC: Tarball contents
    KC->>KC: Build manifests (kustomize build)
    KC->>Cluster: Apply manifests via server-side apply
```

## Authentication

Sources that require authentication reference Kubernetes Secrets. The secret format depends on the source type.

```yaml
# Git SSH authentication
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    github.com ssh-ed25519 AAAA...
```

```yaml
# Reference the secret in your GitRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: private-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/my-org/private-repo
  ref:
    branch: main
  secretRef:
    name: git-ssh-credentials  # Points to the auth secret
```

## Verifying Artifact Integrity

Flux supports verifying Git commits using GPG or Cosign signatures, ensuring that only trusted commits are deployed.

```yaml
# Verify Git commits are signed with a known GPG key
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: verified-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/secure-repo
  ref:
    branch: main
  verify:
    mode: HEAD               # Verify the HEAD commit signature
    provider: cosign          # Or 'openpgp' for GPG
    secretRef:
      name: cosign-public-key
```

## Summary

Sources are the entry point of the Flux CD pipeline. The source-controller fetches content from Git repositories, OCI registries, Helm repositories, and cloud storage buckets, then packages the content into versioned artifacts with checksums. These artifacts are stored locally and served to downstream controllers via an internal HTTP server. Understanding sources and artifacts is essential because they form the foundation of the entire Flux CD reconciliation chain - without a source, there is nothing to reconcile.
