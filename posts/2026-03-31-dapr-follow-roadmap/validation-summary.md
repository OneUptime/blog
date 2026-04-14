# Validation Summary: How to Follow the Dapr Roadmap

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- GitHub CLI (`gh`)
- GitHub API (milestones, releases, subscriptions)
- GitHub Projects
- jq (JSON filtering)

## Sources Consulted
- `gh issue list --help`, `gh release list --help`, `gh release view --help`, `gh api --help`, `gh issue create --help` (local CLI help output)
- GitHub API: `repos/dapr/proposals` — confirmed the repository exists with description "Proposals for new features in Dapr"
- GitHub API: `gh label list --repo dapr/proposals` — verified available labels (no "proposal" label exists)
- GitHub API: `gh label list --repo dapr/dapr --search "feature"` — confirmed the feature label is `kind/feature`, not `feature-request`
- GitHub API: `gh label list --repo dapr/dapr --search "bug"` — confirmed the bug label is `kind/bug`, not `bug`
- GitHub API: `gh release list --repo dapr/dapr` — confirmed recent Dapr releases (latest: v1.17.4)

## Issues Found

### 1. Incorrect label `"proposal"` on `dapr/proposals` repo
- **What was wrong:** The command `gh issue list --repo dapr/proposals --label "proposal"` used a non-existent label. The `dapr/proposals` repo only has default GitHub labels (bug, enhancement, documentation, etc.) — no "proposal" label.
- **Fix:** Removed the `--label "proposal"` filter. Since all issues in the proposals repo are proposals by nature, no label filter is needed.

### 2. Incorrect label `"feature-request"` on `dapr/dapr` repo (3 occurrences)
- **What was wrong:** The blog used `--label "feature-request"` in the monitoring script, and in the `gh issue create` example. The actual label on `dapr/dapr` is `kind/feature`.
- **Fix:** Changed all occurrences of `"feature-request"` to `"kind/feature"`.

### 3. Incorrect label `"bug"` on `dapr/dapr` repo
- **What was wrong:** The monitoring script used `--label "bug"` but the actual label on `dapr/dapr` is `kind/bug`.
- **Fix:** Changed `"bug"` to `"kind/bug"` in the script.

### 4. Misleading GitHub notification filter comment
- **What was wrong:** The comment stated "GitHub Settings -> Notifications -> Filter by label: feature-request" which describes a non-existent UI path in GitHub notification settings.
- **Fix:** Changed to describe the actual GitHub inbox filter syntax: `label:kind/feature repo:dapr/dapr`.

## Review Notes
- The `gh project item-list` and `gh release list --json` commands require relatively modern versions of the GitHub CLI (v2.34.0+ and v2.38.0+ respectively). Both have been available for years as of the post date (March 2026), so this is not an issue for the target audience.
- The milestone example uses `v1.15`, which is an older Dapr version. This is fine as an illustrative example.
- All jq filter expressions are syntactically correct.
- The `dapr/proposals` repository was confirmed to exist and is actively used for feature proposals.
