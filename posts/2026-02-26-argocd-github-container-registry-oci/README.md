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
- **Granular permissions** - Use fine-grained personal access tokens or GitHub App credentials for scoped access.
- **Free for public packages** - Public packages have no storage or bandwidth limits.
- **Package visibility controls** - Packages can be public or private, independent of repository visibility.

## Prerequisites

- ArgoCD v2.8 or later
- Helm CLI v3.8 or later
- A GitHub account with a personal access token (PAT) that has `read:packages` scope
- `gh` CLI (optional, for managing packages)

## Pushing Helm Charts to GHCR

### Manual Push

```bash
# Create a personal access token with write:packages scope
# Go to: Settings > Developer settings > Personal access tokens > Fine-grained tokens

# Log in to GHCR with Helm
echo $GITHUB_TOKEN | helm registry login ghcr.io -u USERNAME --password-stdin

# Package your chart
helm package ./my-chart

# Push to GHCR
# Format: oci://ghcr.io/<owner>/<chart-name>
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
        uses: azure/setup-helm@v3

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

For ArgoCD to pull charts from private GHCR repositories, you need a PAT with `read:packages` scope.

1. Go to GitHub Settings, then Developer settings, then Personal access tokens, then Fine-grained tokens
2. Create a new token with "Read" access to packages
3. Set an appropriate expiration (or use a classic token with `read:packages` for longer-lived access)

### Method 1: ArgoCD CLI

```bash
# Add GHCR as an OCI repository
argocd repo add ghcr.io \
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
  url: ghcr.io
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
    chart: my-org/my-chart
    repoURL: ghcr.io
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
          - chart: my-org/frontend
            version: "2.1.0"
            namespace: frontend
          - chart: my-org/backend
            version: "3.0.1"
            namespace: backend
          - chart: my-org/worker
            version: "1.5.0"
            namespace: workers
  template:
    metadata:
      name: "{{chart}}"
    spec:
      project: default
      source:
        chart: "{{chart}}"
        repoURL: ghcr.io
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

## Using GitHub App Authentication

For organization-level access, a GitHub App provides better security than personal access tokens:

```bash
# Generate an installation access token from your GitHub App
# This requires the app to have read access to packages

# Install the GitHub App on your organization
# Note the App ID and Installation ID

# Generate a JWT and exchange for an installation token
# (This is typically done in automation)
```

Configure ArgoCD with the installation token:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-github-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: ghcr-org
  url: ghcr.io
  enableOCI: "true"
  username: "x-access-token"
  password: "<github-app-installation-token>"
```

Note that GitHub App installation tokens expire after 1 hour, so you need a mechanism to rotate them. A common approach is a CronJob that refreshes the Secret:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: refresh-ghcr-token
  namespace: argocd
spec:
  schedule: "*/50 * * * *"  # Every 50 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: token-refresher
          containers:
            - name: refresh
              image: ghcr.io/my-org/token-refresher:latest
              env:
                - name: GITHUB_APP_ID
                  valueFrom:
                    secretKeyRef:
                      name: github-app-credentials
                      key: app-id
                - name: GITHUB_APP_PRIVATE_KEY
                  valueFrom:
                    secretKeyRef:
                      name: github-app-credentials
                      key: private-key
          restartPolicy: OnFailure
```

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
  url: ghcr.io
  enableOCI: "true"
```

However, unauthenticated requests to GHCR are subject to lower rate limits. For reliability, always authenticate even with public packages.

## Managing Package Visibility

GHCR packages default to private. To make a chart public:

```bash
# Using GitHub CLI
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  /user/packages/container/my-chart/versions \
  -f visibility=public
```

Or navigate to the package settings page on GitHub and change visibility there.

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

**"denied" or "unauthorized" errors**: Ensure your PAT has `read:packages` scope. For fine-grained tokens, check that it has "Read" access to the specific package.

**Package not found**: GHCR packages are scoped to the owner (user or org). Make sure the chart field includes the full path: `my-org/my-chart`.

**Rate limiting**: Even though GHCR is generous with rate limits, authenticated requests get higher limits. Always configure credentials.

**Token expiration**: Fine-grained PATs expire. Set up monitoring or use a classic PAT with no expiration for service accounts (with appropriate security controls).

```bash
# Test connectivity from ArgoCD
argocd repo list

# Check repo-server logs
kubectl logs -n argocd deployment/argocd-repo-server | grep -i ghcr
```

## Summary

GitHub Container Registry is an excellent choice for ArgoCD OCI chart sources, especially when your code and CI/CD already live on GitHub. The integration between GitHub Actions and GHCR makes publishing charts seamless, and fine-grained PATs or GitHub App credentials provide secure access for ArgoCD. For public open-source projects, GHCR's free unlimited storage for public packages is hard to beat.
