# How to Track Who Changed What with Git History in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Git History, Change Tracking, Audit, Traceability

Description: Use Git commit history and pull request metadata to track every change made to a Flux CD GitOps repository, establishing a complete chain of accountability for all infrastructure changes.

---

## Introduction

One of GitOps's most powerful compliance properties is that Git history is an immutable, chronological record of every change to your infrastructure. Every commit has an author, a timestamp, a description of the change, and the exact diff of what was modified. Every merge commit records who approved a PR. This makes GitOps repositories natural audit artifacts.

In practice, getting the most value from Git history for compliance tracking requires consistent commit conventions, well-structured repository layout, and tooling to query and report on the history effectively. This guide shows how to set up commit conventions, query Git history for specific change types, correlate changes to compliance evidence, and generate change reports from your Flux CD repository.

## Prerequisites

- A Flux CD GitOps repository on GitHub
- `git` CLI installed locally
- GitHub CLI (`gh`) for querying PR metadata
- Basic familiarity with `git log` and its formatting options

## Step 1: Establish Commit Convention Standards

Consistent commit messages make Git history queryable. Adopt Conventional Commits:

```plaintext
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

Types relevant to a Flux CD repository:

```plaintext
feat:     New application deployment or new infrastructure component
fix:      Bug fix or rollback
chore:    Dependency update (Renovate PRs), Flux configuration cleanup
deploy:   Image tag or chart version promotion
rollback: Reverting a previous change
suspend:  Suspending or resuming Flux reconciliation
policy:   Adding or modifying OPA/Kyverno policies
security: Security-related changes (RBAC, NetworkPolicy, etc.)
```

Example commits:

```bash
# Good commit messages for Flux repos
git commit -m "deploy: promote my-app v2.5.0 to production (from staging)"
git commit -m "fix: rollback nginx-ingress to v4.9.0 - memory leak in v4.10.0"
git commit -m "security: restrict PHI namespace egress to EU databases only"
git commit -m "feat: add monitoring stack to production cluster"
git commit -m "suspend: pause production reconciliation for Q4 freeze"
```

Enforce this in CI:

```yaml
# .github/workflows/commit-lint.yaml
name: Commit Lint

on:
  pull_request:
    branches: [main]

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: wagoid/commitlint-github-action@v6
        with:
          configFile: '.commitlintrc.json'
```

```json
// .commitlintrc.json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [2, "always", [
      "feat", "fix", "chore", "deploy", "rollback",
      "suspend", "policy", "security", "docs", "ci"
    ]],
    "subject-max-length": [2, "always", 100]
  }
}
```

## Step 2: Query Git History for Specific Change Types

With consistent commit messages, you can query history precisely:

```bash
# All production deployments in the past 90 days
git log --oneline \
  --since="90 days ago" \
  --grep="^deploy:" \
  -- apps/production/ clusters/production/

# All rollbacks ever
git log --oneline --grep="^rollback:" --all

# All security changes
git log --oneline --grep="^security:" --all \
  -- clusters/ apps/

# All changes to a specific application
git log --oneline --follow -- apps/production/my-app/

# Who changed a specific file last
git log --oneline -10 -- apps/production/my-app/helmrelease.yaml

# Show the complete diff of a specific commit
git show a3f9c12 --stat
git show a3f9c12 -- apps/production/my-app/

# Changes by a specific author
git log --author="Alice Smith" --oneline --since="1 year ago"
```

## Step 3: Correlate Git History with PR Approvals

Git merge commits record the PR merge but not the approvers. Use the GitHub API to get approval records:

```bash
#!/bin/bash
# scripts/get-pr-approvals.sh
# Get approval history for all PRs merged in a date range

START_DATE="2026-01-01"
END_DATE="2026-03-31"

echo "PR Approval History: $START_DATE to $END_DATE"
echo "PR Number | Merged At | Merged By | Approvers | Title"

gh pr list \
  --state merged \
  --json number,mergedAt,mergedBy,reviews,title \
  --jq '.[] | select(.mergedAt >= "'$START_DATE'" and .mergedAt <= "'$END_DATE'") |
    "\(.number) | \(.mergedAt) | \(.mergedBy.login) | \([.reviews[] | select(.state=="APPROVED") | .author.login] | join(",")) | \(.title)"' \
  | sort
```

## Step 4: Generate a Full Change Traceability Report

```bash
#!/bin/bash
# scripts/change-traceability-report.sh
# Full change traceability report for compliance audits

PERIOD="${1:-30 days ago}"
REPORT_FILE="reports/change-traceability-$(date +%Y-%m-%d).md"

mkdir -p reports

cat > "$REPORT_FILE" << EOF
# Change Traceability Report
**Generated**: $(date -u)
**Period**: Changes since $PERIOD

## Summary
- Total merges: $(git log --merges --since="$PERIOD" --oneline | wc -l)
- Total commits: $(git log --since="$PERIOD" --oneline | wc -l)
- Authors: $(git log --since="$PERIOD" --format="%an" | sort -u | wc -l)

## Deployments
$(git log --merges \
    --pretty=format:"### %s%n- **Date**: %ad%n- **Author**: %an (%ae)%n- **Commit**: %H%n- **Changed**: %n" \
    --date=iso-strict \
    --since="$PERIOD" \
    --name-only \
    --diff-filter=M \
    -- apps/ clusters/)

## Configuration Changes by Path
EOF

# Add per-path change counts
for path in apps/production clusters/production; do
  COUNT=$(git log --since="$PERIOD" --oneline -- "$path" | wc -l)
  echo "- \`$path\`: $COUNT commits" >> "$REPORT_FILE"
done

echo ""
echo "Report generated: $REPORT_FILE"
```

## Step 5: Visualize Change Attribution

Use `git blame` to see who last changed each configuration value:

```bash
# See who last changed each line in a HelmRelease
git blame apps/production/my-app/helmrelease.yaml

# Example output format:
# a3f9c12 (Alice Smith 2026-03-10) spec:
# a3f9c12 (Alice Smith 2026-03-10)   chart:
# b7c2d45 (Bob Jones  2026-03-08)     version: "2.5.0"

# For a directory, use git log --follow to track renames
git log --follow --oneline apps/production/my-app/

# Annotated log with diff stats
git log --stat --since="90 days ago" -- apps/production/ | head -100
```

## Step 6: Create a Change Management Dashboard

Export data for a GitOps change management dashboard:

```bash
#!/bin/bash
# scripts/export-for-dashboard.sh
# Export JSON suitable for a compliance dashboard

git log \
  --merges \
  --since="1 year ago" \
  --pretty=format:'{
    "sha": "%H",
    "short_sha": "%h",
    "author_name": "%an",
    "author_email": "%ae",
    "date": "%aI",
    "message": "%s"
  },' \
  -- apps/ clusters/ \
  | head -c -1 \
  | sed '1s/^/[/' \
  | sed '$s/$/]/' \
  > reports/deployment-history.json

echo "Exported $(cat reports/deployment-history.json | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))') events"
```

## Best Practices

- Use signed commits (GPG or SSH signing) so the authorship of every commit is cryptographically verified - this strengthens the audit trail for high-compliance environments.
- Never use `git commit --amend` or `git rebase` on shared branches - both rewrite history and destroy the audit trail. Use `git revert` to undo changes.
- Configure `git push --force` (and `--force-with-lease`) to be rejected on the main branch to prevent history rewriting.
- Include a link to the PR number in every commit message body (GitHub does this automatically for merge commits) so you can navigate from a commit to its approval record.
- Archive quarterly Git bundle exports to long-term storage as tamper-evident backups of your audit trail.

## Conclusion

Git history in a Flux CD repository is more than version control - it is a complete record of every infrastructure change, including who made it, when it was made, what exactly was changed, and who approved it. By establishing consistent commit conventions, using structured queries against Git history, and combining commit data with PR approval records, you can produce comprehensive change traceability evidence from your normal development workflow without any additional tooling.
