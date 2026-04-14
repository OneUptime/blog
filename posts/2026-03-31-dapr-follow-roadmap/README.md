# How to Follow the Dapr Roadmap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Roadmap, Planning, Open Source, Community

Description: Track the Dapr project roadmap using GitHub milestones, project boards, and release notes to stay informed about upcoming features and plan your adoption strategy.

---

## Where to Find the Dapr Roadmap

Dapr's roadmap is tracked across several places:

- **GitHub Milestones** - release-specific feature tracking
- **GitHub Projects** - cross-repository planning boards
- **Release Notes** - changelogs for shipped features
- **Community Calls** - roadmap discussions and demos

## GitHub Milestones

Each Dapr release has a milestone that groups issues and PRs:

```bash
# List open milestones for dapr/dapr
gh api repos/dapr/dapr/milestones \
  --jq '.[] | {title: .title, due: .due_on, open: .open_issues, closed: .closed_issues}'

# View issues in a specific milestone
gh issue list \
  --repo dapr/dapr \
  --milestone "v1.15" \
  --state open \
  --limit 50
```

## GitHub Projects Board

```bash
# View the Dapr planning board
# https://github.com/orgs/dapr/projects

# Use GitHub CLI to query project items
gh project item-list 1 \
  --owner dapr \
  --format json \
  --jq '.items[] | select(.status == "In Progress") | .title'
```

## Track Feature Proposals (Proposals Repository)

Significant features go through a proposal process:

```bash
# Browse proposals
gh issue list \
  --repo dapr/proposals \
  --state open \
  --limit 20

# Watch the proposals repo for notifications
gh api repos/dapr/proposals/subscription \
  -X PUT \
  -f subscribed=true
```

## Monitor Release Notes

```bash
# Get the latest Dapr release notes
gh release view --repo dapr/dapr

# List recent releases
gh release list \
  --repo dapr/dapr \
  --limit 10 \
  --json tagName,publishedAt,name
```

## Set Up GitHub Notifications

Stay updated with targeted notifications:

```bash
# Watch specific label: features being planned
gh api repos/dapr/dapr/subscription \
  -X PUT \
  -f subscribed=true

# Filter notifications in your GitHub inbox using:
# label:kind/feature repo:dapr/dapr
```

## Automate Roadmap Monitoring

Create a script to check what's coming in the next release:

```bash
#!/bin/bash
# check-dapr-roadmap.sh
REPO="dapr/dapr"
MILESTONE="${1:-next}"  # Pass milestone version as argument

echo "=== Dapr $MILESTONE Roadmap ==="
echo ""
echo "-- Features --"
gh issue list \
  --repo "$REPO" \
  --milestone "$MILESTONE" \
  --label "kind/feature" \
  --state open \
  --json number,title \
  --jq '.[] | "#\(.number): \(.title)"'

echo ""
echo "-- Bug Fixes --"
gh issue list \
  --repo "$REPO" \
  --milestone "$MILESTONE" \
  --label "kind/bug" \
  --state open \
  --json number,title \
  --jq '.[] | "#\(.number): \(.title)"'
```

```bash
chmod +x check-dapr-roadmap.sh
./check-dapr-roadmap.sh v1.15
```

## Influence the Roadmap

To suggest features or vote on existing proposals:

```bash
# Create a feature request
gh issue create \
  --repo dapr/dapr \
  --title "feat: add support for X in building block Y" \
  --label "kind/feature" \
  --body "## Use Case
I need this because...

## Proposed Solution
A new API endpoint that..."

# Vote on existing proposals with thumbs-up reactions
# Navigate to the issue and add a reaction via GitHub UI
```

## Summary

Tracking the Dapr roadmap involves monitoring GitHub milestones and project boards for release-specific work, the `dapr/proposals` repository for significant feature designs, and community calls for roadmap discussions. Setting up GitHub notifications for the `dapr/dapr` repository keeps you informed about upcoming changes that may affect your adoption plans.
