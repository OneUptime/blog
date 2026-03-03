# How to Push Kustomize Bases to OCI for ArgoCD Consumption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize, OCI

Description: Learn how to package and push Kustomize bases as OCI artifacts to container registries and consume them in ArgoCD applications for reusable, versioned infrastructure components.

---

Kustomize bases are designed to be shared and reused across teams and environments. Traditionally, you would reference remote bases from a Git repository URL, but this approach has drawbacks: it depends on Git server availability, requires Git authentication for private repos, and makes versioning awkward with branch references.

By packaging Kustomize bases as OCI artifacts and pushing them to a container registry, you get proper semantic versioning, fast pulls from a CDN-backed registry, and simplified authentication using the same container registry credentials your cluster already uses.

This guide walks through the full workflow of packaging Kustomize bases, pushing them to OCI registries, and configuring ArgoCD to consume them.

## Why OCI for Kustomize Bases

The traditional approach to sharing Kustomize bases looks like this:

```yaml
# kustomization.yaml referencing a remote Git base
resources:
  - https://github.com/my-org/k8s-bases//nginx-base?ref=v1.2.0
```

This works but has several pain points:

- **Git dependency at deploy time** - ArgoCD needs to clone the remote repo every time it syncs
- **Authentication complexity** - Private repos require SSH keys or tokens for every repo reference
- **No artifact caching** - Every sync re-fetches from Git
- **Version resolution** - Git tags and branches can be mutated

OCI artifacts solve these problems by treating Kustomize bases like any other container artifact - immutable, versioned, cached, and distributed through standard container registry infrastructure.

## The Flux OCI Approach

Kustomize does not natively support OCI artifacts yet, but the Flux project created the `flux push artifact` and `flux pull artifact` commands that work with any OCI registry. Since ArgoCD supports OCI repositories, you can use this approach to share Kustomize bases.

### Install Flux CLI

You only need the Flux CLI for pushing. ArgoCD handles pulling.

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify installation
flux --version
```

### Package and Push a Kustomize Base

Let's say you have a reusable Nginx base:

```text
nginx-base/
  kustomization.yaml
  deployment.yaml
  service.yaml
  configmap.yaml
```

The kustomization.yaml:

```yaml
# nginx-base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

commonLabels:
  app.kubernetes.io/managed-by: kustomize
```

Push it as an OCI artifact:

```bash
# Login to your registry
flux login ghcr.io -u USERNAME --password $GITHUB_TOKEN

# Push the Kustomize base as an OCI artifact
flux push artifact oci://ghcr.io/my-org/k8s-bases/nginx-base:v1.0.0 \
  --path=./nginx-base \
  --source="$(git config --get remote.origin.url)" \
  --revision="$(git rev-parse HEAD)"
```

The `--source` and `--revision` flags embed provenance metadata in the artifact, making it traceable back to the source commit.

### Tag Management

```bash
# Push a new version
flux push artifact oci://ghcr.io/my-org/k8s-bases/nginx-base:v1.1.0 \
  --path=./nginx-base \
  --source="$(git config --get remote.origin.url)" \
  --revision="$(git rev-parse HEAD)"

# Add a floating tag for the latest stable
flux tag artifact oci://ghcr.io/my-org/k8s-bases/nginx-base:v1.1.0 \
  --tag latest

# List tags
flux list artifacts oci://ghcr.io/my-org/k8s-bases/nginx-base
```

## Using ORAS as an Alternative

ORAS (OCI Registry As Storage) is a general-purpose tool for pushing any content to OCI registries:

```bash
# Install ORAS
brew install oras

# Login
oras login ghcr.io -u USERNAME --password $GITHUB_TOKEN

# Push Kustomize base directory
oras push ghcr.io/my-org/k8s-bases/nginx-base:v1.0.0 \
  --artifact-type application/vnd.cncf.kustomize.layer.v1 \
  ./nginx-base/:application/vnd.cncf.kustomize.content.v1.tar+gzip
```

## Automating Pushes with CI/CD

### GitHub Actions Workflow

```yaml
# .github/workflows/publish-kustomize-bases.yaml
name: Publish Kustomize Bases
on:
  push:
    tags:
      - 'v*'
    paths:
      - 'bases/**'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    strategy:
      matrix:
        base: [nginx-base, redis-base, postgres-base]
    steps:
      - uses: actions/checkout@v4

      - name: Install Flux CLI
        run: |
          curl -s https://fluxcd.io/install.sh | sudo bash

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            flux login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Push Kustomize base
        run: |
          VERSION=${GITHUB_REF#refs/tags/}
          flux push artifact \
            oci://ghcr.io/${{ github.repository_owner }}/k8s-bases/${{ matrix.base }}:${VERSION} \
            --path=./bases/${{ matrix.base }} \
            --source="${{ github.repositoryUrl }}" \
            --revision="${{ github.sha }}"
```

## Consuming OCI Kustomize Bases in ArgoCD

Now here is where it gets interesting. ArgoCD can consume OCI artifacts, but the approach depends on how you structure your application.

### Approach 1: Direct OCI Source

If your entire application is a single Kustomize base, configure ArgoCD to pull it directly:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx
  namespace: argocd
spec:
  project: default
  source:
    repoURL: ghcr.io/my-org/k8s-bases/nginx-base
    targetRevision: v1.0.0
    # ArgoCD treats OCI artifacts as directories
    # and runs kustomize build on them
  destination:
    server: https://kubernetes.default.svc
    namespace: nginx
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Approach 2: Multi-Source with OCI Base and Git Overlays

The more powerful pattern combines an OCI-hosted base with Git-hosted overlays. Your base stays versioned in the registry, and environment-specific customizations live in Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-production
  namespace: argocd
spec:
  project: default
  sources:
    # OCI base
    - repoURL: ghcr.io/my-org/k8s-bases/nginx-base
      targetRevision: v1.0.0
      ref: base
    # Git overlay
    - repoURL: https://github.com/my-org/k8s-environments.git
      targetRevision: main
      path: overlays/production/nginx
      kustomize:
        # Reference the OCI base via $base
        # This requires kustomize.yaml in the overlay to reference $base
  destination:
    server: https://kubernetes.default.svc
    namespace: nginx-production
```

The overlay kustomization.yaml would reference the base:

```yaml
# overlays/production/nginx/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - $base

patches:
  - target:
      kind: Deployment
      name: nginx
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5

images:
  - name: nginx
    newTag: 1.25-alpine
```

### Approach 3: Config Management Plugin

For advanced OCI Kustomize workflows, you can create a custom config management plugin that pulls OCI artifacts and runs Kustomize:

```yaml
# argocd-cmp-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmp-cm
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: kustomize-oci
    spec:
      init:
        command: [sh, -c]
        args:
          - |
            # Pull OCI bases referenced in kustomization.yaml
            if grep -q "oci://" kustomization.yaml; then
              flux pull artifact $(grep "oci://" kustomization.yaml | tr -d ' -') --output ./bases/
            fi
      generate:
        command: [sh, -c]
        args:
          - kustomize build .
```

## Registry Credential Setup for ArgoCD

Ensure ArgoCD can authenticate with the OCI registry:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: oci-registry-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  url: ghcr.io
  enableOCI: "true"
  username: "argocd-service"
  password: "<registry-token>"
```

## Versioning Strategy for Kustomize Bases

A good versioning strategy for shared Kustomize bases:

```text
v1.0.0 - Initial stable release
v1.1.0 - Added new configurable parameters (backward compatible)
v1.2.0 - Updated default resource limits
v2.0.0 - Breaking change: renamed fields, restructured overlays
```

In your ArgoCD applications, pin to minor versions for stability:

```yaml
# Good: pinned to exact version
targetRevision: v1.2.0

# Acceptable: track latest patch in a minor
targetRevision: "v1.2.*"
```

## Troubleshooting

**ArgoCD cannot pull the artifact**: Verify credentials are configured and the OCI artifact exists:

```bash
# Test pulling manually
flux pull artifact oci://ghcr.io/my-org/k8s-bases/nginx-base:v1.0.0 --output /tmp/test

# Check ArgoCD repo list
argocd repo list
```

**Kustomize build fails on pulled artifact**: The OCI artifact must contain a valid kustomization.yaml at the root. Verify:

```bash
flux pull artifact oci://ghcr.io/my-org/k8s-bases/nginx-base:v1.0.0 --output /tmp/test
ls -la /tmp/test/
kustomize build /tmp/test/
```

**Version not found**: List available versions:

```bash
flux list artifacts oci://ghcr.io/my-org/k8s-bases/nginx-base
```

## Summary

Packaging Kustomize bases as OCI artifacts gives you proper versioning, fast distribution, and simplified authentication for shared infrastructure components. The Flux CLI is the easiest tool for pushing Kustomize content to OCI registries, and ArgoCD can consume these artifacts directly or as part of multi-source applications. This pattern is especially powerful for platform teams that maintain shared bases consumed by multiple product teams.
