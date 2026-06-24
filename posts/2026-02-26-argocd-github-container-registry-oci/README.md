# How to Use GitHub Container Registry with ArgoCD OCI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GitHub, OCI

Description: Learn how to configure ArgoCD to pull Helm charts and OCI artifacts from GitHub Container Registry using personal access tokens and GitHub App authentication.

---

GitHub Container Registry (GHCR) is GitHub's native container registry that supports OCI artifacts, including Helm charts. If your source code already lives on GitHub, using GHCR for your Helm charts keeps everything under one roof - your code, your CI/CD pipelines, and your deployment artifacts all managed through GitHub's ecosystem.

This guide covers how to push Helm charts to GHCR as OCI artifacts and configure ArgoCD to pull from them, including authentication methods and automation through GitHub Actions.

## Why GHCR for ArgoCD OCI

GitHub Container Registry has several advantages for GitOps workflows:

- **Tight GitHub integration** - Packages are linked to repositories, making it easy to trace which repo produces which chart.
- **GitHub Actions native support** - Push charts as part of your CI pipeline with built-in GITHUB_TOKEN authentication.
- **Granular permissions** - Use package-scoped permissions and repository access controls for scoped access.
- **Free for public packages** - Public packages have no storage or bandwidth limits.
- **Package visibility controls** - Packages can be public or private, independent of repository visibility.

## Prerequisites

- ArgoCD v2.8 or later
- Helm CLI v3.8 or later
- A GitHub account with a classic personal access token (PAT) that has `read:packages` scope
- `gh` CLI (optional, for managing packages)

## Pushing Helm Charts to GHCR

### Manual Push

```bash
# Create a classic personal access token with write:packages scope

# Go to: Settings > Developer settings > Personal access tokens > Tokens (classic)
export CR_PAT=ghp_xxxxxxxxxxxxxxxxxxxx

# Log in to GHCR with Helm
echo $CR_PAT | helm registry login ghcr.io -u USERNAME --password-stdin

# Package your chart
helm package ./my-chart

# Push to GHCR
# Format: oci://ghcr.io/<owner>
# Helm infers the chart name and version from the packaged chart.
helm push my-chart-1.0.0.tgz oci://ghcr.io/my-org
```

### Push from GitHub Actions

Automate chart publishing in your CI pipeline:

```yaml
# .github/workflows/publish-chart.yaml
name: Publish Helm Chart
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v4

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            helm registry login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Package and push chart
        run: |
          helm package ./charts/my-chart
          helm push my-chart-*.tgz oci://ghcr.io/${{ github.repository_owner }}
```

## Configuring ArgoCD to Pull from GHCR

### Create a GitHub Personal Access Token

For ArgoCD to pull charts from private GHCR repositories, you need a classic PAT with `read:packages` scope. GitHub Container Registry authentication outside GitHub Actions uses classic PATs.

1. Go to GitHub Settings, then Developer settings, then Personal access tokens, then Tokens (classic)
2. Create a new token with the `read:packages` scope
3. Set an appropriate expiration (or use a classic token with `read:packages` for longer-lived access)

### Method 1: ArgoCD CLI

```bash
# Add GHCR as an OCI repository
argocd repo add ghcr.io/my-org \
  --type helm \
  --name ghcr \
  --enable-oci \
  --username my-github-username \
  --password ghp_xxxxxxxxxxxxxxxxxxxx
```

### Method 2: Kubernetes Secret

```yaml
# ghcr-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: ghcr
  url: ghcr.io/my-org
  enableOCI: "true"
  username: "my-github-username"
  password: "ghp_xxxxxxxxxxxxxxxxxxxx"
```

```bash
kubectl apply -f ghcr-repo-secret.yaml
```

### Method 3: Repository Credential Template

For multiple GHCR repositories:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: helm
  url: ghcr.io
  enableOCI: "true"
  username: "my-github-username"
  password: "ghp_xxxxxxxxxxxxxxxxxxxx"
```

## Creating ArgoCD Applications from GHCR

### Basic Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    chart: my-chart
    repoURL: ghcr.io/my-org
    targetRevision: 1.0.0
    helm:
      releaseName: my-app
      values: |
        replicaCount: 3
        image:
          repository: ghcr.io/my-org/my-app
          tag: v1.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### ApplicationSet for Multiple Charts

If you publish several charts to GHCR, use an ApplicationSet to manage them:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: ghcr-apps
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - chart: frontend
            version: "2.1.0"
            namespace: frontend
          - chart: backend
            version: "3.0.1"
            namespace: backend
          - chart: worker
            version: "1.5.0"
            namespace: workers
  template:
    metadata:
      name: "{{chart}}"
    spec:
      project: default
      source:
        chart: "{{chart}}"
        repoURL: ghcr.io/my-org
        targetRevision: "{{version}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## GitHub App Authentication Limitations

GitHub App installation tokens are useful for GitHub API automation, but GitHub's GHCR authentication documentation does not document them as registry credentials for `helm registry login` or ArgoCD repository Secrets. For ArgoCD pulls from private GHCR packages, use a classic PAT with `read:packages`. For publishing from GitHub Actions, use `GITHUB_TOKEN` with `packages: write`.

## Public GHCR Packages

For public packages, you can configure ArgoCD without authentication:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-public
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: ghcr-public
  url: ghcr.io/my-org
  enableOCI: "true"
```

However, authentication is still useful if the package might become private later or if you want the same ArgoCD configuration for public and private charts.

## Managing Package Visibility

GHCR packages default to private. To make a chart public, navigate to the package settings page on GitHub and change visibility there.

## Versioning and Tag Management

GHCR supports OCI artifact tags, which map directly to Helm chart versions:

```bash
# List available versions of a chart
# Using the GitHub API
gh api \
  -H "Accept: application/vnd.github+json" \
  /orgs/my-org/packages/container/my-chart/versions | jq '.[].metadata.container.tags'
```

In ArgoCD, reference versions in `targetRevision`:

```yaml
# Exact version
targetRevision: "1.2.3"

# Semantic version constraint
targetRevision: "1.x"
```

## Troubleshooting

**"denied" or "unauthorized" errors**: Ensure your classic PAT has `read:packages` scope and that the package is accessible to the account that owns the token.

**Package not found**: GHCR packages are scoped to the owner (user or org). Make sure `repoURL` includes the owner path, such as `ghcr.io/my-org`, and `chart` is the chart name, such as `my-chart`.

**Public package pulls**: Public GHCR packages can be accessed anonymously. If you need access to private packages, or if package visibility may change, configure credentials.

**Token expiration**: If your classic PAT has an expiration date, set up monitoring or use a service-account token with an appropriate expiration policy and security controls.

```bash
# Test connectivity from ArgoCD
argocd repo list

# Check repo-server logs
kubectl logs -n argocd deployment/argocd-repo-server | grep -i ghcr
```

## Summary

GitHub Container Registry is an excellent choice for ArgoCD OCI chart sources, especially when your code and CI/CD already live on GitHub. The integration between GitHub Actions and GHCR makes publishing charts seamless, and classic PATs provide access for ArgoCD. For public open-source projects, GHCR's free unlimited storage for public packages is hard to beat.
