# How to Implement Branch Strategy for ArgoCD Repos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Branching Strategy, CI/CD

Description: Learn how to design Git branching strategies for ArgoCD config repositories that support environment promotion and team collaboration.

---

The branching strategy for your ArgoCD config repos directly affects how you promote changes between environments, how teams collaborate, and how quickly you can respond to incidents. Unlike application code repos where feature branches and merge strategies are well understood, config repos have unique requirements because every merge to certain branches triggers actual deployments.

## The Core Challenge

In a GitOps workflow, a branch or path in your Git repo maps to a running environment. Merging to main might deploy to production. This means your branching strategy is also your deployment strategy. Get it wrong and you either deploy untested changes to production or create a promotion bottleneck that slows everyone down.

## Strategy 1: Branch Per Environment

The most intuitive approach maps one branch to one environment:

```mermaid
graph LR
    A[dev branch] --> B[staging branch]
    B --> C[main/production branch]
    D[Feature branch] --> A
```

```yaml
# ArgoCD Application for dev - tracks the dev branch
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-dev
spec:
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: dev
    path: manifests/
  destination:
    server: https://dev-cluster.example.com
    namespace: dev

---
# ArgoCD Application for staging - tracks the staging branch
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-staging
spec:
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: staging
    path: manifests/
  destination:
    server: https://staging-cluster.example.com
    namespace: staging

---
# ArgoCD Application for production - tracks main
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
spec:
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: main
    path: manifests/
  destination:
    server: https://prod-cluster.example.com
    namespace: production
```

Promotion means merging between branches:

```bash
# Promote from dev to staging
git checkout staging
git merge dev
git push

# After testing, promote from staging to production
git checkout main
git merge staging
git push
```

**Pros:**
- Simple to understand
- Each environment has its own history
- Easy to see what is deployed where (check the branch)

**Cons:**
- Merge conflicts between branches are common
- Environment-specific configs (like replica counts) must be identical across branches or maintained separately
- Cherry-picking hotfixes to production without including dev changes is messy

## Strategy 2: Single Branch with Directory Per Environment

This is the recommended approach for most teams. Use one branch (main) with Kustomize overlays for each environment:

```text
config-repo/
├── base/
│   ├── kustomization.yaml
│   └── deployment.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        └── kustomization.yaml
```

```yaml
# Each ArgoCD Application points to a different path, same branch
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-dev
spec:
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: main
    path: overlays/dev

---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
spec:
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: main
    path: overlays/production
```

Promotion means updating the image tag in the next environment's overlay:

```bash
# Current state: dev has v2.3.2, staging has v2.3.1
# Promote to staging by updating its kustomization
cd overlays/staging
kustomize edit set image myorg/backend-api:v2.3.2
git add .
git commit -m "promote backend-api v2.3.2 to staging"
git push
```

**Pros:**
- No merge conflicts between branches
- Environment-specific configs are naturally separated
- Atomic commits can update multiple environments
- Works perfectly with Kustomize overlays

**Cons:**
- A single commit can accidentally change multiple environments
- Need branch protection rules and CODEOWNERS to prevent unauthorized production changes

## Strategy 3: Tag-Based Promotion

Use Git tags to mark which version is deployed to each environment:

```yaml
# ArgoCD Application tracks a specific tag
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
spec:
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: production/v2.3.1  # Tag
    path: overlays/production
```

Promotion creates a new tag:

```bash
# Promote to production
git tag production/v2.3.2
git push origin production/v2.3.2

# Update the ArgoCD Application to point to the new tag
# (or automate with ApplicationSet)
```

**Pros:**
- Explicit version control
- Easy rollback (point to a previous tag)
- Clear audit trail

**Cons:**
- Requires updating ArgoCD Application specs for each promotion
- Tag management adds overhead

## Protecting Production Changes

Regardless of strategy, protect production deployments with branch protection and CODEOWNERS:

```text
# CODEOWNERS
# Platform team must approve all production changes
overlays/production/ @myorg/platform-team
**/production/** @myorg/platform-team

# SRE team must approve base changes (affects all environments)
base/ @myorg/sre-team
```

Branch protection rules for main:

```yaml
# GitHub branch protection (configured via UI or API)
branch: main
protection:
  required_pull_request_reviews:
    required_approving_review_count: 1
    require_code_owner_reviews: true
  required_status_checks:
    strict: true
    contexts:
      - validate-kustomize
      - kubeconform
  enforce_admins: true
  allow_force_pushes: false
```

## Handling Hotfixes

When you need to fix production immediately without promoting everything in dev:

### With Branch Per Environment:

```bash
# Create hotfix from production branch
git checkout main
git checkout -b hotfix/fix-memory-leak
# Make the fix
git commit -m "fix: increase memory limit to prevent OOM"
# Merge directly to main (production)
git checkout main
git merge hotfix/fix-memory-leak
git push
# Also merge back to dev and staging
git checkout dev
git merge hotfix/fix-memory-leak
```

### With Single Branch + Overlays:

```bash
# Create PR that only modifies production overlay
git checkout -b hotfix/fix-memory-leak
vim overlays/production/patches/resources.yaml
git commit -m "fix: increase memory limit in production"
# PR targets main, CODEOWNERS requires platform team review
git push -u origin hotfix/fix-memory-leak
gh pr create --title "Hotfix: increase memory limit in production"
```

The single-branch approach is cleaner for hotfixes because you only modify the production overlay. With branch-per-environment, you must merge the hotfix to all branches.

## Automated Promotion Pipelines

Automate the promotion workflow with CI:

```yaml
# .github/workflows/promote.yaml
name: Promote
on:
  workflow_dispatch:
    inputs:
      service:
        description: "Service to promote"
        required: true
      from_env:
        description: "Source environment"
        required: true
        type: choice
        options: [dev, staging]
      to_env:
        description: "Target environment"
        required: true
        type: choice
        options: [staging, production]

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get current version
        id: version
        run: |
          VERSION=$(kustomize build "overlays/${{ inputs.from_env }}" | \
            grep "image:" | head -1 | awk -F: '{print $NF}')
          echo "version=${VERSION}" >> $GITHUB_OUTPUT

      - name: Update target environment
        run: |
          cd "overlays/${{ inputs.to_env }}"
          kustomize edit set image "myorg/${{ inputs.service }}:${{ steps.version.outputs.version }}"

      - name: Create promotion PR
        uses: peter-evans/create-pull-request@v6
        with:
          title: "Promote ${{ inputs.service }} ${{ steps.version.outputs.version }} to ${{ inputs.to_env }}"
          body: |
            Promoting ${{ inputs.service }} from ${{ inputs.from_env }} to ${{ inputs.to_env }}.
            Version: ${{ steps.version.outputs.version }}
          branch: "promote/${{ inputs.service }}-${{ inputs.to_env }}"
          reviewers: platform-team
```

## Summary

For most ArgoCD setups, the single-branch with directory-per-environment strategy is the best choice. It avoids merge conflicts, works naturally with Kustomize overlays, and makes hotfixes straightforward. Use branch protection rules and CODEOWNERS to gate production changes. Automate promotion with CI workflows that update image tags in environment overlays and create PRs for review. The branch-per-environment strategy is simpler to understand but creates maintenance overhead with merge conflicts and multi-branch hotfixes.
