# How to Implement Code Review Workflow for Config Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Code Review, Pull Requests

Description: Learn how to set up a code review workflow for ArgoCD config repository changes that balances speed with safety for production deployments.

---

In a GitOps workflow, merging a pull request is the same as deploying to a cluster. This means your code review process for config changes directly impacts both deployment velocity and production safety. Review too lightly and broken configs reach production. Review too strictly and deployments slow to a crawl. Here is how to find the right balance.

## Why Config Reviews Are Different from Code Reviews

When you review application code, you are checking logic, performance, and maintainability. When you review Kubernetes config changes, you are checking:

- Will this break the running application?
- Are resource requests appropriate for the workload?
- Does this follow our security policies?
- Is the image tag pointing to a valid, tested build?
- Will this change affect other services through shared resources?

Config reviews require infrastructure knowledge, not just programming skills. A developer who writes great Go code might not know that setting memory limits too low causes OOM kills.

## Setting Up Branch Protection

Start with branch protection on your main branch:

```bash
# Using GitHub CLI to configure branch protection
gh api repos/myorg/backend-api-config/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["validate-kustomize","kubeconform","policy-check"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"require_code_owner_reviews":true,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

Key settings:
- **Required reviews**: At least 1 approval, from a CODEOWNER
- **Dismiss stale reviews**: If someone pushes new changes after approval, the approval is dismissed
- **Required status checks**: Kustomize build, schema validation, and policy checks must pass
- **No force pushes**: Prevents history rewriting

## CODEOWNERS for Environment-Based Approval

Use CODEOWNERS to route reviews based on what is being changed:

```text
# CODEOWNERS

# Any changes to base require SRE review
base/ @myorg/sre-team

# Dev changes - service team can self-approve
overlays/dev/ @myorg/backend-team

# Staging changes - service team + lead
overlays/staging/ @myorg/backend-team @myorg/tech-leads

# Production changes - require platform team approval
overlays/production/ @myorg/platform-team

# RBAC and security changes always need security team
**/rbac/ @myorg/security-team
**/network-policies/ @myorg/security-team
**/pod-security/ @myorg/security-team

# CRDs and cluster-scoped resources need platform team
**/crds/ @myorg/platform-team
**/cluster-roles/ @myorg/platform-team
```

This creates a tiered review system:
- Dev changes are lightweight reviews
- Staging requires team lead oversight
- Production requires platform team approval
- Security-sensitive changes always need the security team

## Automated Validation Checks

Every PR should pass automated checks before human review. This catches the obvious issues so reviewers can focus on design decisions.

```yaml
# .github/workflows/pr-validation.yaml
name: PR Validation
on:
  pull_request:
    branches: [main]

jobs:
  validate-structure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/
          wget -q https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
          tar xf kubeconform-linux-amd64.tar.gz && sudo mv kubeconform /usr/local/bin/

      - name: Build all overlays
        run: |
          for env in dev staging production; do
            echo "=== Building ${env} ==="
            kustomize build "overlays/${env}" > "/tmp/${env}.yaml"
            echo "${env}: OK"
          done

      - name: Validate against Kubernetes schemas
        run: |
          for env in dev staging production; do
            echo "=== Validating ${env} ==="
            kubeconform -strict -summary "/tmp/${env}.yaml"
          done

      - name: Check for common mistakes
        run: |
          for env in dev staging production; do
            # Check for latest tag (should not be in staging/production)
            if [ "$env" != "dev" ]; then
              if grep -q ":latest" "/tmp/${env}.yaml"; then
                echo "ERROR: Found :latest tag in ${env} environment"
                exit 1
              fi
            fi

            # Check for missing resource limits
            CONTAINERS=$(yq e '.spec.template.spec.containers[].name' "/tmp/${env}.yaml" 2>/dev/null)
            for container in $CONTAINERS; do
              if ! grep -q "limits:" "/tmp/${env}.yaml"; then
                echo "WARNING: Container may be missing resource limits in ${env}"
              fi
            done
          done

  policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install OPA/Conftest
        run: |
          wget -q https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz
          tar xf conftest_Linux_x86_64.tar.gz && sudo mv conftest /usr/local/bin/

      - name: Run policy checks
        run: |
          for env in dev staging production; do
            kustomize build "overlays/${env}" | conftest test - -p policies/
          done

  diff-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate diff preview
        run: |
          # Build current main version
          git stash
          git checkout main
          for env in dev staging production; do
            kustomize build "overlays/${env}" > "/tmp/${env}-main.yaml" 2>/dev/null || true
          done
          git checkout -

          # Build PR version
          git stash pop 2>/dev/null || true
          for env in dev staging production; do
            kustomize build "overlays/${env}" > "/tmp/${env}-pr.yaml"
          done

          # Generate diffs
          DIFF_OUTPUT=""
          for env in dev staging production; do
            DIFF=$(diff -u "/tmp/${env}-main.yaml" "/tmp/${env}-pr.yaml" || true)
            if [ -n "$DIFF" ]; then
              DIFF_OUTPUT="${DIFF_OUTPUT}\n### ${env}\n\`\`\`diff\n${DIFF}\n\`\`\`\n"
            fi
          done

          if [ -n "$DIFF_OUTPUT" ]; then
            echo -e "## Rendered Manifest Diff\n${DIFF_OUTPUT}" > /tmp/diff-comment.md
          else
            echo "## Rendered Manifest Diff\nNo changes to rendered manifests." > /tmp/diff-comment.md
          fi

      - name: Post diff as PR comment
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: /tmp/diff-comment.md
```

The diff preview is especially valuable. It shows reviewers the actual Kubernetes manifests that will be applied, not just the Kustomize overlay changes. This catches issues where a small overlay change has a large rendered impact.

## OPA Policies for Automated Guardrails

Write Open Policy Agent (OPA) policies that enforce your organization's standards:

```rego
# policies/deployment.rego
package main

# Deny deployments without resource limits
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.limits
  msg := sprintf("Container '%s' in Deployment '%s' must have resource limits", [container.name, input.metadata.name])
}

# Deny privileged containers
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  container.securityContext.privileged == true
  msg := sprintf("Container '%s' must not run as privileged", [container.name])
}

# Deny images without specific tags
deny[msg] {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  endswith(container.image, ":latest")
  msg := sprintf("Container '%s' must not use :latest tag", [container.name])
}

# Warn if replicas are less than 2 in production
warn[msg] {
  input.kind == "Deployment"
  input.metadata.namespace == "production"
  input.spec.replicas < 2
  msg := sprintf("Deployment '%s' in production should have at least 2 replicas", [input.metadata.name])
}
```

## Review Checklist for Reviewers

Create a PR template that guides reviewers:

```markdown
<!-- .github/pull_request_template.md -->
## Change Summary
<!-- What is changing and why? -->

## Environment(s) Affected
- [ ] Dev
- [ ] Staging
- [ ] Production

## Review Checklist
### For the author:
- [ ] Kustomize build succeeds locally
- [ ] Image tags point to tested builds
- [ ] Resource requests/limits are appropriate
- [ ] No secrets in plaintext

### For the reviewer:
- [ ] Changes match the stated intent
- [ ] Resource changes are reasonable (no 10x jumps)
- [ ] Image tag exists in the container registry
- [ ] No unintended changes to other environments
- [ ] Rollback plan is clear (revert this PR)

## Rollback Plan
Revert this PR: `git revert <commit>`
```

## Expedited Reviews for Incidents

During incidents, the normal review process is too slow. Set up a fast path:

```yaml
# CODEOWNERS exception for hotfix branches
# Hotfix branches only need one SRE approval
# (configured via branch protection rule for hotfix/* branches)
```

```bash
# Create a hotfix branch with expedited review
git checkout -b hotfix/fix-oom-kill
# Make the fix
git commit -m "hotfix: increase memory limit to 4Gi"
git push -u origin hotfix/fix-oom-kill

# Create PR with urgent label
gh pr create \
  --title "HOTFIX: increase backend-api memory limit" \
  --body "Production OOM kills detected. Increasing memory limit from 2Gi to 4Gi." \
  --label "hotfix,urgent" \
  --reviewer "@myorg/sre-oncall"
```

Configure a separate branch protection rule for hotfix branches that requires fewer approvals:

- Regular PRs to main: 1 CODEOWNER approval + all checks pass
- Hotfix PRs: 1 SRE approval + basic validation only

## Summary

Config review workflows for ArgoCD repos need automated validation (kustomize build, schema checks, policy enforcement), rendered manifest diffs so reviewers see what actually changes, and tiered CODEOWNERS that match review rigor to environment risk. Dev changes get lightweight reviews, production changes require platform team approval, and security changes always need the security team. Set up a fast path for hotfixes so the review process does not slow down incident response. The goal is catching real issues before they reach production while keeping the deployment velocity high.
