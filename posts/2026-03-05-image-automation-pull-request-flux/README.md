# How to Configure Image Automation with Pull Request Creation in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Pull Requests, CI/CD

Description: Learn how to configure Flux ImageUpdateAutomation to push image tag updates to a separate branch, enabling pull request workflows for review before merging.

---

## Introduction

By default, Flux ImageUpdateAutomation commits image tag updates directly to the branch it checks out. In many teams, however, changes must go through a pull request review process before reaching the main branch. Flux supports this by allowing you to configure `spec.git.push.branch` to a different branch than the checkout branch. Combined with external tooling or notification webhooks, you can create a full PR-based image update workflow.

## Prerequisites

- A Kubernetes cluster with Flux installed
- The image-automation-controller deployed
- ImageRepository and ImagePolicy resources configured and resolving
- Git credentials with push access

## How It Works

When `spec.git.push.branch` differs from `spec.git.checkout.ref.branch`, the image-automation-controller:

1. Checks out the source branch (e.g., `main`)
2. Applies image tag updates using the setter strategy
3. Commits the changes
4. Pushes to the target branch (e.g., `flux-image-updates`)

This creates or updates the target branch with the latest image tag changes, without modifying the main branch directly.

## Step 1: Configure ImageUpdateAutomation

Set up the ImageUpdateAutomation with separate checkout and push branches.

```yaml
# image-update-automation-pr.yaml
# Pushes image updates to a separate branch for pull request review
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: |
        Automated image update

        {{range .Changed.Changes}}
        - {{.OldValue}} -> {{.NewValue}}
        {{end}}
    push:
      branch: flux-image-updates
  update:
    path: ./clusters/production
    strategy: Setters
```

The key difference from a standard configuration is the `push.branch` field. Flux will push commits to `flux-image-updates` instead of `main`.

## Step 2: Apply the Configuration

```bash
# Apply the ImageUpdateAutomation with PR branch configuration
kubectl apply -f image-update-automation-pr.yaml
```

## Step 3: Set Up Automatic PR Creation with Notifications

Flux itself does not create pull requests, but you can use the notification-controller to trigger a webhook when the push happens. The webhook can call a CI/CD system or a script that creates the PR.

First, configure a notification provider that targets a webhook endpoint.

```yaml
# notification-provider.yaml
# Provider that triggers a webhook when Flux pushes image updates
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: pr-creator
  namespace: flux-system
spec:
  type: generic
  address: https://ci.example.com/api/create-pr
  secretRef:
    name: webhook-secret
```

Then create an Alert that fires when the ImageUpdateAutomation pushes.

```yaml
# alert-image-update.yaml
# Alert that triggers PR creation when image updates are pushed
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: image-update-pr
  namespace: flux-system
spec:
  providerRef:
    name: pr-creator
  eventSources:
    - kind: ImageUpdateAutomation
      name: flux-system
```

## Step 4: Create PRs with GitHub Actions

An alternative approach uses a GitHub Actions workflow that monitors the `flux-image-updates` branch and creates a PR when it is updated.

```yaml
# .github/workflows/create-image-update-pr.yaml
# GitHub Actions workflow that creates a PR when Flux pushes image updates
name: Create Image Update PR

on:
  push:
    branches:
      - flux-image-updates

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: flux-image-updates

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          branch: flux-image-updates
          base: main
          title: "Automated image update from Flux"
          body: |
            This PR was created automatically by Flux image automation.
            Please review the image tag changes before merging.
          labels: |
            automated
            image-update
```

This workflow triggers whenever Flux pushes to the `flux-image-updates` branch and creates or updates a pull request targeting `main`.

## Step 5: Create PRs with the gh CLI

For GitLab or other providers, you can use a simple script triggered by the webhook.

```bash
#!/bin/bash
# create-pr.sh
# Script to create a PR using the GitHub CLI
# Can be triggered via webhook from Flux notifications

# Check if a PR already exists for this branch
EXISTING_PR=$(gh pr list --head flux-image-updates --state open --json number -q '.[0].number')

if [ -z "$EXISTING_PR" ]; then
  # Create a new PR
  gh pr create \
    --base main \
    --head flux-image-updates \
    --title "Automated image update from Flux" \
    --body "This PR contains automated image tag updates from Flux." \
    --label "automated,image-update"
  echo "Created new PR"
else
  echo "PR #$EXISTING_PR already exists, Flux will update the branch"
fi
```

## How Flux Handles the Push Branch

Important behaviors to understand:

- Flux always checks out the source branch (`main`), applies updates on top of it, and force-pushes to the target branch.
- If the target branch already exists, it will be updated with a new commit based on the latest source branch.
- If the PR has already been merged and the target branch deleted, Flux will recreate it on the next run that detects an update.
- Each automation run starts fresh from the checkout branch, so the push branch always reflects the current state of the source branch plus the latest image tags.

## Handling Multiple Updates

When several images update between PR review cycles, Flux accumulates all changes into a single commit on the push branch. This means your PR will always show the complete set of pending image updates, not just the most recent one.

## Verifying the Workflow

Force a reconciliation and check that the branch was created.

```bash
# Trigger reconciliation
flux reconcile image update flux-system -n flux-system

# Verify the push branch was created
kubectl get imageupdateautomation flux-system -n flux-system \
  -o jsonpath='{.status.lastPushCommit}'

# Check the branch in your repository
git fetch origin
git log origin/flux-image-updates --oneline -5
```

## Conclusion

Configuring `spec.git.push.branch` to a branch different from the checkout branch lets Flux create image tag updates without bypassing your pull request review process. Combined with GitHub Actions, webhooks, or CI/CD scripts, you get a complete workflow where every image update is reviewed before it reaches production.
