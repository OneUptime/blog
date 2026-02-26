# How to Implement Pull Request Reviews for Deployment Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Code Review, Security

Description: Learn how to implement effective pull request review workflows for ArgoCD deployment changes including automated checks, review checklists, and approval gates.

---

In a GitOps world, pull requests are your deployment approval gate. Every change to your ArgoCD config repository is a potential deployment, and the PR review process is where you catch misconfigured resources, security issues, and accidental changes before they reach your clusters. This guide shows you how to build a robust PR review workflow specifically for infrastructure and deployment changes.

## Why PR Reviews for Deployments

Traditional deployments use CI/CD pipeline approvals or manual promotion gates. GitOps replaces those with Git-native review processes:

- **Full audit trail** - Every change, reviewer, and comment is recorded in Git
- **Contextual reviews** - Reviewers see exactly what will change in the cluster
- **Collaborative** - Teams can discuss changes before they are deployed
- **Automated validation** - CI checks run before any human reviews
- **Rollback is revert** - If a deployment is bad, revert the PR

## Setting Up the Review Workflow

### PR Template for Deployment Changes

Create a PR template that guides reviewers:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->
## Deployment Change

### What is changing?
<!-- Describe what this change deploys or modifies -->

### Environment(s) affected
- [ ] Development
- [ ] Staging
- [ ] Production

### Type of change
- [ ] New application deployment
- [ ] Image/version update
- [ ] Configuration change (ConfigMap, env vars)
- [ ] Infrastructure change (scaling, resources, network)
- [ ] Security change (RBAC, network policies, secrets)

### Pre-deployment checklist
- [ ] Changes tested in a lower environment first
- [ ] No secrets or credentials in this PR
- [ ] Resource limits are set appropriately
- [ ] Health checks are configured
- [ ] Rollback plan documented (or revert is sufficient)

### Reviewer checklist
- [ ] YAML is valid and follows team conventions
- [ ] No unintended changes to other environments
- [ ] Security implications reviewed
- [ ] Resource requests/limits are reasonable
- [ ] Image tags use specific versions (not latest)
```

### Automated PR Checks

Run comprehensive automated checks before any human review:

```yaml
# .github/workflows/pr-checks.yaml
name: PR Deployment Checks
on:
  pull_request:
    branches: [main, staging]
    paths:
      - 'services/**'
      - 'platform/**'

jobs:
  # Job 1: Validate YAML and Kubernetes manifests
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kustomize
        run: |
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/

      - name: Build and validate manifests
        run: |
          find . -name kustomization.yaml -exec dirname {} \; | while read dir; do
            echo "Building $dir..."
            kustomize build "$dir" > /tmp/manifests.yaml
            echo "Validating $dir..."
            kubectl apply --dry-run=client -f /tmp/manifests.yaml 2>&1 || echo "FAILED: $dir"
          done

  # Job 2: Security scanning
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

      - name: Policy checks
        run: |
          # Check for common security issues
          # No privileged containers
          if grep -r "privileged: true" services/ platform/; then
            echo "ERROR: Privileged containers found"
            exit 1
          fi

          # No host network
          if grep -r "hostNetwork: true" services/ platform/; then
            echo "ERROR: Host network access found"
            exit 1
          fi

          # No latest tags
          if grep -r "image:.*:latest" services/ platform/; then
            echo "WARNING: 'latest' image tags found - use specific versions"
            exit 1
          fi

  # Job 3: Diff preview
  diff-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate diff summary
        id: diff
        run: |
          echo "## Changes Summary" > diff-report.md
          echo "" >> diff-report.md

          # List changed files
          echo "### Modified files:" >> diff-report.md
          git diff --name-only origin/main | while read file; do
            echo "- \`$file\`" >> diff-report.md
          done

          # Show image tag changes
          echo "" >> diff-report.md
          echo "### Image changes:" >> diff-report.md
          git diff origin/main -- '*.yaml' | grep -E "^[+-].*image:" | head -20 >> diff-report.md || echo "No image changes" >> diff-report.md

          # Show replica changes
          echo "" >> diff-report.md
          echo "### Replica changes:" >> diff-report.md
          git diff origin/main -- '*.yaml' | grep -E "^[+-].*replicas:" | head -20 >> diff-report.md || echo "No replica changes" >> diff-report.md

      - name: Post diff as PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('diff-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

## ArgoCD Diff Preview in PR

Show what ArgoCD will actually apply:

```yaml
# .github/workflows/argocd-diff.yaml
name: ArgoCD Diff
on:
  pull_request:
    branches: [main]

jobs:
  argocd-diff:
    runs-on: ubuntu-latest
    env:
      ARGOCD_SERVER: argocd.example.com
    steps:
      - uses: actions/checkout@v4

      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x /usr/local/bin/argocd

      - name: Login to ArgoCD
        run: |
          argocd login "$ARGOCD_SERVER" \
            --auth-token "${{ secrets.ARGOCD_AUTH_TOKEN }}" \
            --grpc-web

      - name: Generate diffs
        run: |
          echo "## ArgoCD Diff Preview" > argocd-diff.md
          echo "" >> argocd-diff.md

          # Get list of apps affected by changes
          changed_paths=$(git diff --name-only origin/main | xargs -I{} dirname {} | sort -u)

          for app in $(argocd app list -o name); do
            app_path=$(argocd app get "$app" -o json | jq -r '.spec.source.path')
            for changed in $changed_paths; do
              if echo "$changed" | grep -q "$app_path"; then
                echo "### $app" >> argocd-diff.md
                echo '```diff' >> argocd-diff.md
                argocd app diff "$app" \
                  --revision "${{ github.event.pull_request.head.sha }}" \
                  2>&1 >> argocd-diff.md || echo "No diff available" >> argocd-diff.md
                echo '```' >> argocd-diff.md
                echo "" >> argocd-diff.md
              fi
            done
          done

      - name: Post ArgoCD diff as PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('argocd-diff.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: diff
            });
```

## Review Roles and Responsibilities

Define clear roles for different types of changes:

### Application Developers

Can review and approve:
- Image tag updates for their own services
- ConfigMap changes for their services
- Resource limit adjustments within approved ranges

### Team Leads

Can also review and approve:
- New application deployments in their team's namespace
- Scaling changes (replicas, HPA configuration)
- Service configuration changes

### Platform Engineers

Required for:
- Network policy changes
- RBAC modifications
- Namespace creation
- Cluster-scoped resource changes
- Shared infrastructure modifications

### Security Team

Required for:
- Any changes to security-related resources
- Ingress and exposure changes
- Secret management configuration
- Policy engine rules

## Implementing Approval Gates with Labels

Use GitHub labels to track approval status:

```yaml
# .github/workflows/approval-gate.yaml
name: Approval Gate
on:
  pull_request_review:
    types: [submitted]

jobs:
  check-approvals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check approval requirements
        uses: actions/github-script@v7
        with:
          script: |
            const { data: reviews } = await github.rest.pulls.listReviews({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
            });

            const approvals = reviews
              .filter(r => r.state === 'APPROVED')
              .map(r => r.user.login);

            // Check if production changes have platform team approval
            const { data: files } = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
            });

            const hasProductionChanges = files.some(f =>
              f.filename.includes('/production/')
            );

            if (hasProductionChanges) {
              // Require platform team member approval
              const platformMembers = ['platform-lead', 'sre-lead'];
              const hasPlatformApproval = approvals.some(a =>
                platformMembers.includes(a)
              );

              if (!hasPlatformApproval) {
                core.setFailed('Production changes require platform team approval');
              }
            }
```

## Blocking Auto-Merge for Critical Changes

Some changes should never auto-merge:

```yaml
# .github/workflows/block-auto-merge.yaml
name: Block Auto-Merge
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  check-critical:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Check for critical changes
        run: |
          critical=false

          # Check for RBAC changes
          if git diff --name-only origin/main | grep -q "rbac\|role"; then
            echo "CRITICAL: RBAC changes detected"
            critical=true
          fi

          # Check for network policy changes
          if git diff --name-only origin/main | grep -q "networkpolic"; then
            echo "CRITICAL: Network policy changes detected"
            critical=true
          fi

          # Check for namespace deletion
          if git diff origin/main | grep -q "^-.*kind: Namespace"; then
            echo "CRITICAL: Namespace deletion detected"
            critical=true
          fi

          if [ "$critical" = true ]; then
            echo "This PR contains critical changes and requires manual review"
            # Add a label to prevent auto-merge
            gh pr edit ${{ github.event.pull_request.number }} --add-label "critical-review-needed"
          fi
```

## Best Practices

1. **Keep PRs small** - One logical change per PR makes reviews easier
2. **Include context** - Explain why the change is needed, not just what changed
3. **Show the diff** - Automated ArgoCD diff previews save reviewer time
4. **Separate environments** - Different PRs for staging and production promotions
5. **Time-box reviews** - Set expectations for review turnaround time
6. **Require fresh reviews** - Dismiss stale reviews when new commits are pushed

For more on ArgoCD security patterns, see our guide on [securing the GitOps pipeline](https://oneuptime.com/blog/post/2026-02-26-argocd-secure-gitops-pipeline/view) and [ArgoCD RBAC policies](https://oneuptime.com/blog/post/2026-01-25-rbac-policies-argocd/view).
