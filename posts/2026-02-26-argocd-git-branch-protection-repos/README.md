# How to Implement Git Branch Protection for ArgoCD Repos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Git

Description: Learn how to configure Git branch protection rules for ArgoCD configuration repositories to prevent unauthorized changes and enforce review processes before deployments.

---

In a GitOps workflow, your Git repository is the control plane for your infrastructure. Anyone who can push to the main branch of your config repo can deploy to production. That makes branch protection rules the single most important security control in your entire deployment pipeline. This guide shows you how to set them up properly for ArgoCD repositories.

## Why Branch Protection Matters for GitOps

Without branch protection:

- A compromised developer account can push directly to main and deploy to production
- Accidental force pushes can wipe out deployment history
- Untested changes can reach production without review
- There is no audit trail of who approved what

With proper branch protection, every change to your deployed infrastructure goes through a controlled review process.

## GitHub Branch Protection Setup

### Basic Protection for Main Branch

Navigate to your config repo settings or use the GitHub API:

```bash
# Set branch protection via GitHub CLI
gh api repos/org/config-repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["validate-manifests","lint-yaml"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### Recommended Rules

Here is the full set of protection rules for a production config repo:

```yaml
# Branch protection configuration (conceptual YAML - applied via API or UI)
branch: main
rules:
  # Require pull request before merging
  require_pull_request:
    required_approving_reviews: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
    require_last_push_approval: true

  # Require status checks
  required_status_checks:
    strict: true  # Branch must be up to date before merging
    checks:
      - validate-manifests
      - lint-yaml
      - dry-run-sync
      - security-scan

  # Require signed commits
  require_signed_commits: true

  # Require conversation resolution
  require_conversation_resolution: true

  # Restrict who can push
  restrict_pushes:
    users: []  # No direct pushes allowed
    teams: []

  # Prevent force pushes and deletions
  allow_force_pushes: false
  allow_deletions: false

  # Apply to admins too
  enforce_admins: true

  # Require linear history (no merge commits)
  require_linear_history: false
```

## CODEOWNERS File

CODEOWNERS ensures the right people review changes to the right files:

```
# CODEOWNERS for GitOps config repo

# Platform team owns all infrastructure
/platform/                @org/platform-team

# Each team owns their service configs
/services/team-a/         @org/team-a-leads
/services/team-b/         @org/team-b-leads

# ArgoCD application definitions require platform approval
/apps/                    @org/platform-team

# AppProject changes require security review
/projects/                @org/platform-team @org/security-team

# Shared libraries require platform approval
/lib/                     @org/platform-team

# Production overlays require both team and platform approval
/services/*/overlays/production/  @org/platform-team
```

With `require_code_owner_reviews` enabled, a PR modifying production overlays requires approval from both the platform team and the security team.

## CI Status Checks

Set up mandatory CI checks that must pass before merging:

### Manifest Validation

```yaml
# .github/workflows/validate.yaml
name: Validate Manifests
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
          tar xf kubeval-linux-amd64.tar.gz
          sudo mv kubeval /usr/local/bin/

      - name: Validate all overlays
        run: |
          find . -name kustomization.yaml -exec dirname {} \; | while read dir; do
            echo "Validating $dir..."
            kustomize build "$dir" | kubeval --strict --kubernetes-version 1.28.0
          done

      - name: Lint YAML
        uses: ibiqlik/action-yamllint@v3
        with:
          file_or_dir: .
          config_data: |
            extends: default
            rules:
              line-length:
                max: 200
```

### Security Scanning

```yaml
# .github/workflows/security-scan.yaml
name: Security Scan
on:
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy config scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: config
          scan-ref: .
          severity: HIGH,CRITICAL
          exit-code: 1

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: kubernetes
          soft_fail: false
```

### Dry-Run Sync Check

Validate that ArgoCD can actually render and apply the manifests:

```yaml
# .github/workflows/dry-run.yaml
name: ArgoCD Dry Run
on:
  pull_request:
    branches: [main]

jobs:
  dry-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get changed applications
        id: changes
        run: |
          # Find which ArgoCD applications are affected by this PR
          changed_dirs=$(git diff --name-only origin/main | xargs -I{} dirname {} | sort -u)
          echo "changed=$changed_dirs" >> $GITHUB_OUTPUT

      - name: ArgoCD diff check
        env:
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
          ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_AUTH_TOKEN }}
        run: |
          # Install ArgoCD CLI
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd

          # Check diff for affected applications
          for app in $(argocd app list -o name); do
            echo "Checking diff for $app..."
            argocd app diff "$app" --revision "${{ github.event.pull_request.head.sha }}" || true
          done
```

## GitLab Branch Protection

If you use GitLab instead of GitHub:

```bash
# Set branch protection via GitLab API
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --request PUT \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/repository/branches/main/protect" \
  --data "developers_can_push=false" \
  --data "developers_can_merge=false"

# Set merge request approval rules
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  --request POST \
  "https://gitlab.com/api/v4/projects/$PROJECT_ID/approval_rules" \
  --data "name=Production Approval" \
  --data "approvals_required=2" \
  --data "group_ids[]=$PLATFORM_TEAM_GROUP_ID"
```

## Environment-Specific Branch Protection

Different environments may need different levels of protection:

```yaml
# Development branch: lightweight protection
# - 1 reviewer required
# - Status checks must pass
# - Allow force pushes (for rebasing)

# Staging branch: moderate protection
# - 1 reviewer required
# - Status checks must pass
# - No force pushes
# - Require signed commits

# Main/production branch: maximum protection
# - 2 reviewers required
# - Code owner review required
# - All status checks must pass
# - No force pushes or deletions
# - Require signed commits
# - Enforce for admins
```

## Integrating with ArgoCD

ArgoCD can be configured to only sync from protected branches:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  sourceRepos:
    - https://github.com/org/config-repo.git
  # ArgoCD will only allow applications that reference the main branch
  # Combine this with the Application targetRevision
```

Set the Application to track a specific branch:

```yaml
spec:
  source:
    targetRevision: main  # Only deploy from the protected branch
```

## Monitoring Branch Protection

Regularly audit that branch protection rules are in place:

```bash
# Check branch protection status
gh api repos/org/config-repo/branches/main/protection | jq '{
  enforce_admins: .enforce_admins.enabled,
  required_reviews: .required_pull_request_reviews.required_approving_review_count,
  dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
  code_owners: .required_pull_request_reviews.require_code_owner_reviews,
  status_checks: [.required_status_checks.contexts[]],
  force_push: .allow_force_pushes.enabled,
  deletion: .allow_deletions.enabled
}'
```

Branch protection is your first and most important line of defense in a GitOps pipeline. Without it, all other security measures can be bypassed by pushing directly to the deployment branch. For more on ArgoCD security, see our guide on [ArgoCD GnuPG key verification](https://oneuptime.com/blog/post/2026-01-30-argocd-gnupg-keys/view) and [ArgoCD project roles](https://oneuptime.com/blog/post/2026-01-30-argocd-project-roles/view).
