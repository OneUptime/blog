# How to Use the Dapr Bot for Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Bot, Automation, GitHub, Contribution

Description: Use the Dapr Bot GitHub automation to manage pull requests, trigger CI workflows, assign reviewers, and navigate the Dapr contribution process efficiently.

---

## What is the Dapr Bot?

The Dapr Bot (`@dapr-bot`) is a GitHub automation tool that manages the Dapr project's GitHub workflow. It handles PR labeling, CI triggering, reviewer assignment, and release management. Understanding how to interact with it streamlines the contribution process.

## Common Dapr Bot Commands

Dapr Bot responds to slash commands posted as comments on issues and PRs:

```text
/ok-to-test            - Trigger E2E tests on a PR (requires maintainer)
/assign                - Assign the issue to yourself (issues only)
/ok-to-perf            - Trigger performance tests on a PR (requires maintainer)
/ok-to-perf-components - Trigger component perf tests (requires maintainer)
/test-sdk-all          - Trigger all SDK tests (requires maintainer)
/test-sdk-java         - Trigger Java SDK tests (requires maintainer)
/test-sdk-python       - Trigger Python SDK tests (requires maintainer)
/test-sdk-js           - Trigger JS SDK tests (requires maintainer)
/test-sdk-go           - Trigger Go SDK tests (requires maintainer)
/test-version-skew     - Trigger version skew tests (requires maintainer)
```

## Triggering CI with /ok-to-test

First-time contributors need a maintainer to run `/ok-to-test` before E2E tests execute. This prevents malicious code from running in CI:

```bash
# Comment on your PR (maintainer only):
/ok-to-test

# After this, the bot triggers E2E tests on the PR.
# Unit tests and linting run automatically via GitHub Actions
# on PR creation and do not require bot approval.
```

## Requesting a Review

The Dapr project uses standard GitHub review requests and CODEOWNERS for reviewer assignment rather than bot commands. To request a review, use the GitHub UI or the CLI:

```bash
# Request a review using the GitHub CLI
gh pr edit 1234 --repo dapr/dapr --add-reviewer @username
```

## Checking Bot Status

The bot posts status updates as comments on PRs after triggering test workflows. The Dapr project uses standard GitHub pull request reviews for approvals rather than bot-managed labels. Check the status of your PR using:

```bash
gh pr checks 1234 --repo dapr/dapr
```

## Automating Your Own Project with Dapr Bot Patterns

You can implement similar automation in your own Dapr projects using GitHub Actions:

```yaml
# .github/workflows/dapr-ci.yml
name: Dapr Application CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Dapr CLI
        run: |
          wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
          dapr --version

      - name: Initialize Dapr
        run: dapr init

      - name: Run tests with Dapr sidecar
        run: |
          dapr run \
            --app-id test-app \
            --app-port 8080 \
            --dapr-http-port 3500 \
            -- npm test

      - name: Verify Dapr is running
        run: dapr list
```

## Label-Based Workflow

The Dapr project uses labels to track PR status:

```text
size/XS, S, M, L, XL - PR size labels (auto-assigned)
do-not-merge          - Block merge
```

Note that PR approvals in the Dapr project are handled through standard GitHub pull request reviews, not bot-managed labels.

Monitor your PR labels:

```bash
gh pr view 1234 --repo dapr/dapr --json labels
```

## Auto-Assign Reviewers via CODEOWNERS

```bash
# .github/CODEOWNERS in your own project
# Automatically requests review from the right team
/src/state/         @team-a
/src/pubsub/        @team-b
/src/workflow/      @team-c
```

## Summary

The Dapr Bot automates GitHub workflows through slash commands like `/ok-to-test` and `/ok-to-perf`, allowing maintainers to trigger E2E and performance tests on PRs from external contributors. PR approvals are handled through standard GitHub reviews. For your own Dapr projects, GitHub Actions with the Dapr CLI and CODEOWNERS files provide similar automation to enforce code review workflows and keep CI reliable.
