# How to Implement Change Approval Process with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Change Management, Approval Process, ITIL, Compliance

Description: Enforce a complete change approval workflow using Git branch protection and Flux CD so every infrastructure change is authorized, documented, and traceable before reaching production.

---

## Introduction

A change approval process ensures that no change reaches production without the appropriate review, testing, and sign-off. In traditional IT service management (ITIL), this is implemented through a Change Advisory Board (CAB) and formal change request forms. In GitOps with Flux CD, the same outcomes are achieved through pull requests, branch protection rules, and automated validation - but the workflow is native to the development toolchain that engineers already use.

This guide shows how to implement a change approval process that satisfies ITIL Change Management requirements using Flux CD and GitHub, including standard changes (routine, pre-approved), normal changes (require explicit approval), and emergency changes (fast-track with post-incident review).

## Prerequisites

- Flux CD managing one or more environments
- GitHub repository with admin access for branch protection
- Teams configured in GitHub for reviewer assignment
- A ticketing system (optional but recommended for change record tracking)

## Step 1: Classify Changes and Define Approval Requirements

Document your change classification in the repository:

```yaml
# docs/change-classification.yaml
# This ConfigMap serves as living documentation of the change approval matrix
apiVersion: v1
kind: ConfigMap
metadata:
  name: change-approval-matrix
  namespace: flux-system
  annotations:
    description: "Change classification and approval requirements"
data: |
  standard-change:
    description: "Routine, pre-approved changes with known low risk"
    examples:
      - Dependency patch version updates (Renovate PRs)
      - ConfigMap value updates within approved ranges
    approval-required: "1 reviewer"
    testing-required: "CI validation only"
    change-window: "Any time during business hours"

  normal-change:
    description: "Changes requiring individual assessment and approval"
    examples:
      - Application image version promotions
      - Infrastructure configuration changes
      - New service deployments
    approval-required: "2 reviewers including CODEOWNER"
    testing-required: "Staging validation + CI"
    change-window: "Deployment window only"

  emergency-change:
    description: "Critical fixes that bypass normal approval gates"
    examples:
      - Production outage fixes
      - Critical security patches
    approval-required: "Incident commander + 1 reviewer"
    testing-required: "Basic validation; full review post-incident"
    change-window: "Any time with IC authorization"
```

## Step 2: Configure Branch Protection per Change Classification

GitHub branch protection rules implement the approval requirements:

```bash
# Configure via GitHub CLI (run once by admin)
gh api repos/your-org/fleet-infra/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field required_status_checks='{"strict":true,"contexts":["validate-flux-manifests","security-scan"]}' \
  --field enforce_admins=true \
  --field restrictions='{"users":[],"teams":["platform-admins"]}' \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

For environments that require different approval thresholds, use separate repository branches:

```plaintext
main        → Production (2 required approvers, Code Owner required)
staging     → Staging (1 required approver)
development → Development (no required approvers; CI required)
```

## Step 3: Implement Change Request Templates

Create PR templates for each change type:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/normal-change.md -->
## Change Request - Normal Change

**Change Type**: Normal Change

**Summary of Change**:

**Risk Assessment**:
- Risk Level: [ ] Low [ ] Medium [ ] High
- Blast Radius: [ ] Single service [ ] Multiple services [ ] Platform-wide
- Rollback Complexity: [ ] Simple (git revert) [ ] Complex (describe below)

**Testing Evidence**:
- [ ] Validated in staging environment
- [ ] CI checks pass (manifest validation, security scan)
- [ ] Load test / smoke test completed (for high-risk changes)

**Rollback Plan**:
`git revert <sha>` - note any additional manual steps

**Deployment Window Compliance**:
- [ ] Change scheduled within approved deployment window
- [ ] On-call engineer notified of planned change

**Change Ticket Reference**:
CHG-YYYY-NNNN (link to your change management system)

**Approvals Required**:
- [ ] Application team reviewer
- [ ] Platform team reviewer (CODEOWNER)
```

## Step 4: Automate Change Risk Detection in CI

Add a CI step that automatically detects high-risk changes and annotates the PR:

```yaml
# .github/workflows/risk-analysis.yaml
name: Change Risk Analysis

on:
  pull_request:
    branches: [main]

jobs:
  risk-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Analyze change risk
        run: |
          # Check for high-risk indicators
          RISK_LEVEL="low"
          WARNINGS=""

          # Production RBAC changes are high risk
          if git diff --name-only origin/main...HEAD | grep -q "rbac"; then
            RISK_LEVEL="high"
            WARNINGS="$WARNINGS\n⚠️ RBAC changes detected - security review required"
          fi

          # Namespace deletions are high risk
          if git diff origin/main...HEAD | grep -q "kind: Namespace" && \
             git diff origin/main...HEAD | grep -q "^-"; then
            RISK_LEVEL="high"
            WARNINGS="$WARNINGS\n⚠️ Namespace deletion detected - impact assessment required"
          fi

          # Large number of files changed
          CHANGED=$(git diff --name-only origin/main...HEAD | wc -l)
          if [ "$CHANGED" -gt 10 ]; then
            RISK_LEVEL="medium"
            WARNINGS="$WARNINGS\n⚠️ $CHANGED files changed - consider splitting into smaller PRs"
          fi

          echo "Risk Level: $RISK_LEVEL"
          echo -e "Warnings: $WARNINGS"

          if [ "$RISK_LEVEL" = "high" ]; then
            # Add a label to the PR via API
            gh pr edit ${{ github.event.number }} --add-label "high-risk"
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Step 5: Track Approvals in a Change Management System

Integrate PR merges with your ITSM ticketing system (ServiceNow, Jira, etc.):

```yaml
# .github/workflows/change-record.yaml
name: Update Change Record

on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  update-change-record:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Update ITSM Change Record
        run: |
          # Extract change ticket number from PR description
          TICKET=$(echo "${{ github.event.pull_request.body }}" \
            | grep "CHG-" | grep -oP 'CHG-\d{4}-\d{4}' | head -1)

          if [ -n "$TICKET" ]; then
            # Update the change record with merge details
            curl -X PATCH \
              "https://itsm.example.com/api/changes/$TICKET" \
              -H "Authorization: Bearer ${{ secrets.ITSM_TOKEN }}" \
              -H "Content-Type: application/json" \
              -d "{
                \"status\": \"implemented\",
                \"implementation_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"implemented_by\": \"${{ github.event.pull_request.merged_by.login }}\",
                \"pr_url\": \"${{ github.event.pull_request.html_url }}\",
                \"commit_sha\": \"${{ github.event.pull_request.merge_commit_sha }}\"
              }"
          fi
```

## Step 6: Verify the Change Approval Chain

After a merge, confirm the approval chain is complete:

```bash
# Check the most recent merge commit and its approvers
MERGE_SHA=$(git log --merges --oneline -1 --format="%H")

echo "Recent merge: $MERGE_SHA"

# Get PR details via GitHub API
gh pr list --state merged --json number,mergedAt,reviews,author \
  --jq '.[0] | {
    pr: .number,
    merged_at: .mergedAt,
    author: .author.login,
    approvers: [.reviews[] | select(.state=="APPROVED") | .author.login]
  }'
```

## Best Practices

- Publish the change approval matrix as documentation in the repository so all engineers know the requirements before opening a PR.
- Use GitHub's "required number of approvals" and "Code Owners" settings as the technical enforcement mechanism - do not rely on policy documents alone.
- Conduct monthly reviews of rejected PRs (those closed without merging) to identify whether your approval process is creating unnecessary friction.
- Keep emergency change exceptions minimal and always require a post-incident review that files a retrospective PR updating any configuration that was temporarily bypassed.
- Use labels (standard-change, normal-change, emergency-change) on PRs to make the change classification visible at a glance in your PR dashboard.

## Conclusion

A change approval process with Flux CD and GitHub branch protection gives you ITIL-aligned change management implemented directly in your engineering workflow. Every change - whether routine or emergency - flows through a documented, auditable process where the approval evidence lives permanently in Git. The result is a change management practice that satisfies compliance requirements while remaining fast enough for a modern engineering team.
