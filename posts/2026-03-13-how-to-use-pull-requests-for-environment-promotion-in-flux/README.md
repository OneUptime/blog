# How to Use Pull Requests for Environment Promotion in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Pull Requests, Environment Promotion, CI/CD, Repository Structure

Description: Learn how to use pull requests as a promotion mechanism in Flux to move changes between environments with proper review and approval workflows.

---

## Why Pull Requests for Promotion

Pull request-based promotion provides code review, approval gates, CI validation, and an audit trail for every change that moves between environments. This approach works well for teams that want human oversight over production deployments while maintaining the benefits of GitOps automation.

## Repository Structure

The key to PR-based promotion is using separate branches for each environment. Keep the application manifests at the same paths on each branch so a PR from one environment branch to the next promotes the files Flux reconciles:

```text
flux-repo/
├── clusters/
│   ├── staging/
│   │   └── flux-system/
│   │       └── gotk-sync.yaml
│   └── production/
│       └── flux-system/
│           └── gotk-sync.yaml
└── apps/
    ├── kustomization.yaml
    └── web-app/
        ├── kustomization.yaml
        └── release.yaml
```

## Branch Strategy

Use environment-specific branches:

- `main` - Source of truth for staging deployments
- `production` - Source of truth for production deployments, with the same manifest paths as `main`

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
```

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
    branch: production
  url: ssh://git@github.com/myorg/flux-repo.git
  secretRef:
    name: flux-system
```

## The Promotion Workflow

The promotion flow follows these steps:

```bash
# 1. Developer creates a feature branch and makes changes
git checkout -b feature/update-app main
# ... make changes to apps/web-app/ ...
git commit -m "Update web-app to v2.0"
git push origin feature/update-app

# 2. Create PR to main (staging)
gh pr create --base main --title "Deploy web-app v2.0 to staging"

# 3. After staging PR is merged, verify in staging
flux get kustomizations --context=staging

# 4. Create promotion PR from main to production
gh pr create --base production --head main \
  --title "Promote web-app v2.0 to production"
```

## Automated Promotion PR Creation

Automate the creation of promotion PRs when staging is verified:

```yaml
# .github/workflows/promote.yaml
name: Create Promotion PR
on:
  push:
    branches:
      - main
    paths:
      - "apps/**"

permissions:
  contents: read
  pull-requests: write

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Create promotion PR
        env:
          # Use a GitHub App token or fine-grained PAT so the created PR triggers validation workflows.
          GH_TOKEN: ${{ secrets.PROMOTION_PR_TOKEN }}
        run: |
          # Check if a promotion PR already exists
          EXISTING_PR=$(gh pr list --base production --head main --json number -q '.[0].number')

          if [ -z "$EXISTING_PR" ]; then
            gh pr create \
              --base production \
              --head main \
              --title "Promote changes to production" \
              --body "Automated promotion PR. Changes verified in staging."
          else
            echo "Promotion PR #${EXISTING_PR} already exists"
          fi
```

## Adding CI Validation to Promotion PRs

Run validation checks on promotion PRs before they can be merged:

```yaml
# .github/workflows/validate-promotion.yaml
name: Validate Promotion
on:
  pull_request:
    branches:
      - production

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Configure production kubeconfig
        run: |
          mkdir -p "$HOME/.kube"
          echo "${{ secrets.PRODUCTION_KUBECONFIG }}" > "$HOME/.kube/config"
          chmod 600 "$HOME/.kube/config"

      - name: Validate Kustomizations
        run: |
          find . -name kustomization.yaml -exec dirname {} \; | while read dir; do
            echo "Validating $dir"
            kubectl kustomize "$dir" | kubectl apply --dry-run=client -f -
          done

      - name: Run diff against production
        run: |
          set +e
          flux diff kustomization apps \
            --path=./apps \
            --context=production
          status=$?
          if [ "$status" -gt 1 ]; then
            exit "$status"
          fi
```

## Branch Protection Rules

Configure branch protection to enforce the promotion workflow:

```bash
# Protect the production branch
gh api repos/myorg/flux-repo/branches/production/protection -X PUT \
  -F required_status_checks[strict]=true \
  -F required_status_checks[contexts][]=validate \
  -F enforce_admins=true \
  -F required_pull_request_reviews[required_approving_review_count]=2 \
  -F restrictions=null
```

Key settings for the production branch:
- Require pull request reviews (at least 2 approvers)
- Require status checks to pass
- Require branches to be up to date
- Restrict who can push directly

## Single Branch Alternative

If you prefer a single branch approach, use directory-based promotion with PRs:

```bash
# 1. Make changes to staging
git checkout -b update-staging
# edit apps/staging/web-app/release.yaml
git commit -m "Update staging to v2.0"
# Create PR, get review, merge

# 2. After staging verification, promote to production
git checkout -b promote-to-prod
# Copy or update apps/production/ to match staging
cp apps/staging/web-app/release.yaml apps/production/web-app/release.yaml
git commit -m "Promote v2.0 to production"
# Create PR with production reviewers
```

## Tracking Promotion Status

Use GitHub labels and milestones to track promotions:

```yaml
# .github/workflows/label-promotion.yaml
name: Label Promotion PRs
on:
  pull_request:
    branches:
      - production

permissions:
  pull-requests: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: ['promotion', 'production']
            });
```

## Conclusion

Pull request-based environment promotion provides a structured, auditable workflow for moving changes through environments with Flux. By using branch protection rules, CI validation, and automated PR creation, teams can maintain strict control over production deployments while keeping the benefits of GitOps automation. This approach integrates naturally with existing code review practices and provides clear visibility into what is being promoted and who approved it.
