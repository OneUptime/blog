# How to Contribute to the Dapr Open Source Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Open Source, Contribution, GitHub, Community

Description: Learn how to make your first contribution to the Dapr open source project, from finding good first issues to submitting pull requests and navigating the review process.

---

## Why Contribute to Dapr?

Dapr is a CNCF project with a welcoming community and a clear contribution path. Contributing builds expertise in distributed systems, gets you recognized in the cloud-native community, and directly improves tools used by thousands of developers.

## Repository Overview

Dapr spans multiple repositories:

```text
github.com/dapr/dapr          # Core runtime (Go)
github.com/dapr/components-contrib  # Community components (Go)
github.com/dapr/docs          # Documentation (Markdown)
github.com/dapr/dotnet-sdk    # .NET SDK (C#)
github.com/dapr/python-sdk    # Python SDK
github.com/dapr/js-sdk        # JavaScript/TypeScript SDK
github.com/dapr/java-sdk      # Java SDK
```

## Find a Good First Issue

```bash
# Browse "good first issue" labels on GitHub
# https://github.com/dapr/dapr/issues?q=is%3Aopen+is%3Aissue+label%3A"good+first+issue"

# Or use GitHub CLI
gh issue list \
  --repo dapr/dapr \
  --label "good first issue" \
  --state open \
  --limit 20
```

## Fork and Clone

```bash
# Fork via GitHub UI, then clone your fork
git clone https://github.com/YOUR_USERNAME/dapr.git
cd dapr

# Add upstream remote
git remote add upstream https://github.com/dapr/dapr.git

# Verify remotes
git remote -v
```

## Set Up the Development Environment

```bash
# Prerequisites for dapr/dapr (Go-based)
go version  # Check go.mod in the repo for the required Go version

# Install dependencies
make build

# Run tests
make test

# For dapr/components-contrib
make lint
make test
```

## Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout -b fix/issue-1234 upstream/master

# Make your changes, then commit
git add -p  # Stage changes selectively
git commit -m "fix: correct retry backoff calculation in resiliency"
```

## Run Linting Before PR

```bash
# Go code
make lint

# Check formatting
gofmt -l ./...

# Run specific tests related to your change
go test ./pkg/resiliency/... -v
```

## Submit a Pull Request

```bash
# Push to your fork
git push origin fix/issue-1234

# Create PR via GitHub CLI
gh pr create \
  --repo dapr/dapr \
  --title "fix: correct retry backoff calculation in resiliency" \
  --body "Fixes #1234. The exponential backoff was not applying jitter correctly..." \
  --label "bug"
```

## DCO Sign-Off

Dapr requires Developer Certificate of Origin sign-off:

```bash
git commit -s -m "fix: correct retry backoff calculation"
# Adds: Signed-off-by: Your Name <email@example.com>
```

## PR Review Checklist

Before marking your PR ready for review:
- [ ] Tests added for new behavior
- [ ] Existing tests pass (`make test`)
- [ ] Linting passes (`make lint`)
- [ ] Documentation updated if needed
- [ ] DCO signed

## Summary

Contributing to Dapr starts with finding a "good first issue" on GitHub, forking the relevant repository, setting up the Go or SDK development environment, and submitting a pull request with tests and DCO sign-off. The Dapr community uses GitHub Discussions and community calls to help first-time contributors get their changes merged.
