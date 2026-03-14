# How to Implement GitOps Approval Gates with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Approval Gates, Branch Protection, CODEOWNERS

Description: Use branch protection rules and CODEOWNERS to require explicit approvals before Flux CD reconciles changes into your Kubernetes cluster.

---

## Introduction

An approval gate in GitOps is a policy that prevents a change from reaching the cluster until a designated group of people have explicitly signed off. Without approval gates, anyone with write access to your repository can deploy to production simply by committing to the Flux-watched branch. Approval gates close that gap by enforcing human review as a prerequisite to reconciliation.

Flux CD does not have a built-in approval UI - it trusts Git. That is a feature, not a gap. By using your version control platform's native approval mechanisms (branch protection, CODEOWNERS, required reviewers), you get approval gates that are version-controlled, auditable, and enforced at the Git level rather than inside a single tool.

This guide walks through setting up multi-layer approval gates: a CODEOWNERS file that routes change reviews to the right team, branch protection rules that block merges without approval, and environment-specific Flux Kustomizations so that production deployments require stricter gates than staging.

## Prerequisites

- Flux CD bootstrapped to a GitHub repository
- GitHub repository with admin access
- Multiple Flux Kustomizations configured for different environments
- `flux` CLI installed locally

## Step 1: Define Environment-Specific Kustomizations

Structure your repository so each environment is a separate Flux Kustomization. This lets you apply different approval requirements per environment by controlling which paths require which approvals.

```yaml
# clusters/production/apps/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production         # Only production manifests live here
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
  timeout: 5m
```

```yaml
# clusters/staging/apps/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-staging
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/staging            # Staging manifests in a separate path
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 2: Create a CODEOWNERS File

Map directory paths to teams so GitHub automatically assigns the correct reviewers when a PR touches those paths.

```plaintext
# .github/CODEOWNERS

# Any change to production app manifests requires sign-off from both
# the platform team and the application team
/apps/production/     @your-org/platform-team @your-org/app-owners

# Staging changes only need the application team
/apps/staging/        @your-org/app-owners

# Cluster-level infrastructure always requires the platform team
/clusters/            @your-org/platform-team

# Flux system configuration requires senior platform engineers
/clusters/production/flux-system/  @your-org/senior-platform
```

GitHub automatically adds the listed code owners as required reviewers on any PR that touches those paths.

## Step 3: Configure Branch Protection Rules

Navigate to **Settings → Branches → Add rule** for the `main` branch:

```plaintext
Branch name pattern: main

Required settings:
  ✅ Require a pull request before merging
     - Required approving reviews: 2  (for production paths)
     - Dismiss stale pull request approvals when new commits are pushed
     - Require review from Code Owners

  ✅ Require status checks to pass before merging
     - Status checks: validate-flux-manifests

  ✅ Require branches to be up to date before merging

  ✅ Restrict who can push to matching branches
     - Allow: @your-org/platform-team (only, not all developers)

  ✅ Do not allow bypassing the above settings
```

With these rules, no merge can land on `main` - and therefore no deployment can happen - without the required approvals.

## Step 4: Add a Staged Approval Flow for High-Risk Changes

For changes that touch multiple environments, enforce a sequential approval pattern using GitHub Environments with required reviewers.

```yaml
# .github/workflows/promote.yaml
name: Promote to Production

on:
  push:
    branches: [main]
    paths:
      - 'apps/production/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate manifests
        run: |
          find apps/production -name "*.yaml" | \
          xargs kubeconform -strict -ignore-missing-schemas -summary

  # This job requires a manual approval in GitHub Environments
  # before it runs, acting as an additional gate beyond PR approval
  approve-production:
    needs: validate
    runs-on: ubuntu-latest
    environment:
      name: production          # Configure required reviewers here in GitHub UI
    steps:
      - name: Approved
        run: echo "Production deployment approved by ${{ github.actor }}"
```

In GitHub go to **Settings → Environments → production** and add required reviewers. This creates a second approval gate after PR merge but before the CI job completes its record.

## Step 5: Verify Approval Gate Behavior

Test that the approval gates work end to end:

```bash
# Attempt a direct push to main (should be rejected by branch protection)
git push origin main  # Expected: remote rejected

# Create a PR and observe CODEOWNERS auto-assignment
git checkout -b feature/update-production-image
# ... make a change to apps/production/ ...
git push origin feature/update-production-image
gh pr create --title "Update production image" --base main

# Check the PR - CODEOWNERS should have auto-requested reviews
gh pr view --json reviewRequests
```

After the PR is merged and Flux reconciles, confirm the gate was recorded:

```bash
# Flux events show the reconciliation with a timestamp
flux events --for Kustomization/apps-production

# Git log shows the PR merge commit with approval metadata
git log --oneline -5
```

## Best Practices

- Set required approving reviews to at least 2 for production paths - a single approver is a single point of failure.
- Use separate CODEOWNERS entries for each environment to enforce progressively stricter gates as changes move toward production.
- Record approval metadata in PR descriptions using a standardized template so auditors can quickly find the evidence.
- Combine CODEOWNERS with team-level permissions so rotating staff does not leave gaps in coverage.
- Review and update CODEOWNERS whenever teams change - stale ownership creates unenforced gates.
- Use GitHub's "Required reviewers" in Environments for an additional gate that fires after merge for regulated workflows.

## Conclusion

Approval gates in Flux CD are implemented at the Git layer, not inside Kubernetes. By combining CODEOWNERS-based review routing with branch protection rules and optional environment approval gates, you create a deployment pipeline where every change to production must pass through designated human approvers. The approvals are recorded in Git history permanently, satisfying audit requirements while keeping the workflow familiar to developers who already use pull requests every day.
