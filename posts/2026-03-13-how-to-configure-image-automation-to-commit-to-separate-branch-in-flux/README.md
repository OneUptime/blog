# How to Configure Image Automation to Commit to Separate Branch in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, GitOps, Git, Branching, Kubernetes

Description: Learn how to configure Flux ImageUpdateAutomation to commit image tag updates to a separate branch from the one it checks out.

---

## Introduction

While committing image updates directly to the main branch works for continuous deployment, many teams prefer a more controlled approach. By configuring Flux ImageUpdateAutomation to commit to a separate branch, you create an opportunity for review, testing, or approval before the changes reach the main branch. This pattern supports workflows where image updates are staged on a dedicated branch and then merged through pull requests.

This guide shows you how to configure Flux to checkout from one branch and push image updates to a different branch.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- At least one ImageRepository and ImagePolicy configured
- A GitRepository source with write access
- Deployment manifests with image policy markers

## Configuring Separate Branch Push

The key is setting different values for the checkout branch and the push branch:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "Automated image update"
    push:
      branch: flux-image-updates
  update:
    path: ./clusters/production
    strategy: Setters
```

In this configuration, Flux checks out `main`, applies image tag updates, commits the changes, and pushes them to the `flux-image-updates` branch. The `main` branch remains unchanged until someone merges the updates.

## How the Separate Branch Works

The workflow operates as follows:

1. Flux checks out the `main` branch
2. It applies any pending image tag updates to the manifests
3. It commits the changes and pushes to `flux-image-updates`
4. On subsequent runs, Flux checks out `main` again (not the push branch)
5. It re-applies any updates that are still pending (not yet merged to main)
6. If the push branch already has the same changes, no new commit is made

This means the push branch always contains the latest image updates relative to the current state of the main branch. When you merge the push branch into main, the next automation run will find no pending changes and will not create a new commit.

## Setting Up the GitRepository

Make sure the GitRepository has write access:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/myorg/my-repo.git
  ref:
    branch: main
  secretRef:
    name: git-ssh-credentials
```

## Refining the Push Branch Name

You can use a descriptive branch name that includes the environment or cluster:

```yaml
spec:
  git:
    push:
      branch: automation/production-image-updates
```

Or include the automation name for multiple automations:

```yaml
spec:
  git:
    push:
      branch: automation/staging-images
```

## Combining with Pull Request Workflows

The separate branch pattern is most useful when combined with pull request automation. After Flux pushes to the separate branch, a CI workflow or bot can create a pull request:

```yaml
# GitHub Actions workflow triggered when the automation branch is pushed
name: Create Image Update PR
on:
  push:
    branches:
      - flux-image-updates

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: flux-image-updates
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          branch: flux-image-updates
          base: main
          title: "Automated image updates"
          body: "This PR contains automated image tag updates from Flux."
```

## Handling Multiple Environments

For multiple environments, create separate automations each pushing to different branches:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: staging-image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "Update staging images"
    push:
      branch: automation/staging-images
  update:
    path: ./clusters/staging
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "Update production images"
    push:
      branch: automation/production-images
  update:
    path: ./clusters/production
    strategy: Setters
```

## When to Use Same Branch vs Separate Branch

Use same-branch commits when you want full continuous deployment with no manual gates. Use separate-branch commits when you need code review, CI checks before deployment, approval workflows, or audit trails through pull request history.

## Verifying the Configuration

Check the automation status:

```bash
flux get image update image-updates
```

Check the push branch:

```bash
git fetch origin flux-image-updates
git log origin/flux-image-updates --oneline -5
```

Compare with main:

```bash
git diff main..origin/flux-image-updates
```

## Conclusion

Configuring Flux ImageUpdateAutomation to commit to a separate branch adds a review layer to your image update workflow. Flux handles the mechanics of checking out the source branch, applying updates, and pushing to the target branch. You control what happens next through pull requests, CI pipelines, or manual merges. This approach balances automation speed with governance requirements, letting you automate the detection and preparation of updates while keeping human review in the deployment path.
