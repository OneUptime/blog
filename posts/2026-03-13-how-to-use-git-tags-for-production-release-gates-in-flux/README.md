# How to Use Git Tags for Production Release Gates in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Release Management, Git Tags, CI/CD

Description: Learn how to use Git tags as release gates in Flux to control when changes are promoted to production, providing an explicit approval mechanism for deployments.

---

## Why Git Tags as Release Gates

In many organizations, deploying to production requires an explicit approval step. Using Git tags as release gates means that changes only reach production when a specific tag is created, providing a clear audit trail and a deliberate promotion mechanism. This separates the cadence of development from the cadence of production releases.

## How It Works

The strategy is straightforward: staging tracks a branch (like `main`) and automatically deploys every commit, while production tracks Git tags matching a specific pattern (like `v*`). Creating a new tag triggers a production deployment.

## Repository Structure

```text
flux-repo/
├── clusters/
│   ├── staging/
│   │   └── flux-system/
│   │       ├── gotk-components.yaml
│   │       ├── gotk-sync.yaml
│   │       └── kustomization.yaml
│   └── production/
│       └── flux-system/
│           ├── gotk-components.yaml
│           ├── gotk-sync.yaml
│           └── kustomization.yaml
└── apps/
    ├── base/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        └── kustomization.yaml
```

## Configuring Staging to Track a Branch

Staging automatically deploys from the main branch:

```yaml
# clusters/staging/flux-system/gotk-sync.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: ssh://git@github.com/myorg/flux-repo.git
  secretRef:
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Configuring Production to Track Tags

Production only deploys when a new semver tag is created:

```yaml
# clusters/production/flux-system/gotk-sync.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    semver: ">=1.0.0"
  url: ssh://git@github.com/myorg/flux-repo.git
  secretRef:
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

The `semver` reference tells Flux to find the latest tag that matches the given semver constraint and deploy that specific commit.

## Using Tag Patterns Instead of Semver

If you prefer a different tagging convention, use the `tag` field with regex:

```yaml
# For exact tag matching
spec:
  ref:
    tag: v1.5.0

# Or use semver ranges
spec:
  ref:
    semver: ">=1.0.0 <2.0.0"

# Or semver with pre-release filtering
spec:
  ref:
    semver: ">=1.0.0-0"
```

## The Release Workflow

Here is the typical workflow for promoting changes to production:

```bash
# 1. Develop and merge to main (auto-deploys to staging)
git checkout main
git pull
git merge feature/new-feature

# 2. Verify changes in staging
flux get kustomizations --context=staging

# 3. When ready for production, create a release tag
git tag -a v1.5.0 -m "Release v1.5.0: new feature XYZ"
git push origin v1.5.0

# 4. Flux detects the new tag and deploys to production
flux get kustomizations --context=production
```

## Automating Tag Creation with CI

Integrate tag creation into your CI pipeline for a more controlled process:

```yaml
# .github/workflows/release.yaml
name: Create Release
on:
  workflow_dispatch:
    inputs:
      version:
        description: "Release version (e.g., 1.5.0)"
        required: true
      commit_sha:
        description: "Commit SHA to tag (defaults to main HEAD)"
        required: false

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Validate version format
        run: |
          if ! echo "${{ github.event.inputs.version }}" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
            echo "Invalid version format. Use semver (e.g., 1.5.0)"
            exit 1
          fi

      - name: Create and push tag
        run: |
          SHA="${{ github.event.inputs.commit_sha }}"
          if [ -z "$SHA" ]; then
            SHA=$(git rev-parse HEAD)
          fi
          git tag -a "v${{ github.event.inputs.version }}" "$SHA" \
            -m "Release v${{ github.event.inputs.version }}"
          git push origin "v${{ github.event.inputs.version }}"
```

## Rolling Back with Tags

To roll back production, point Flux to a previous tag:

```yaml
# Option 1: Pin to a specific older tag
spec:
  ref:
    tag: v1.4.0

# Option 2: Use semver range to exclude the bad version
spec:
  ref:
    semver: ">=1.0.0 <1.5.0"
```

Or create a new patch tag from the previous release:

```bash
# Checkout the previous release
git checkout v1.4.0

# Create a new tag
git tag -a v1.5.1 -m "Rollback: revert to v1.4.0 state"
git push origin v1.5.1
```

## Monitoring Tag-Based Deployments

Track which tag is currently deployed:

```bash
# Check the current source revision
flux get sources git flux-system

# Output shows the deployed tag
# NAME         REVISION        READY
# flux-system  v1.5.0/abc123   True

# Check deployment status
flux get kustomizations
```

## Conclusion

Git tags provide a natural and auditable release gate for production deployments with Flux. By configuring staging to track a branch and production to track semver tags, you create a clear separation between continuous delivery to staging and controlled releases to production. The tag-based approach integrates well with existing release workflows and provides a straightforward rollback mechanism by creating new tags or pinning to previous ones.
