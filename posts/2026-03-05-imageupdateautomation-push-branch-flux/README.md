# How to Configure ImageUpdateAutomation Push Branch in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, ImageUpdateAutomation, Image Automation, Git Branches

Description: Learn how to configure the push branch for Flux CD's ImageUpdateAutomation to control where automated image updates are committed.

---

Flux CD's ImageUpdateAutomation controller can push automated image tag updates to any branch in your Git repository. By configuring the push branch, you control whether updates go directly to the main branch or to a separate branch for review. This flexibility is critical for teams that require pull request approvals before changes reach production.

## Direct Push to Main Branch

The simplest configuration pushes image updates directly to the same branch that was checked out:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 30m
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
      messageTemplate: 'Automated image update'
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

This is the fastest path to production. When Flux detects a new image tag, it updates the manifest, commits the change, and pushes directly to `main`. The source-controller then detects the new commit and reconciles the cluster.

## Pushing to a Separate Branch

For teams that require code review or CI checks before merging, configure the push branch to differ from the checkout branch:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 30m
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

        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}
    push:
      branch: flux-image-updates
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

When the push branch differs from the checkout branch, the controller:

1. Checks out the `main` branch
2. Applies image tag updates to the manifests
3. Commits the changes
4. Pushes to the `flux-image-updates` branch

If the `flux-image-updates` branch does not exist, the controller creates it from the checkout branch. If it already exists, the controller rebases the changes onto it.

## Automating Pull Request Creation

Pushing to a separate branch is most useful when combined with automated pull request creation. Flux's notification controller can trigger a webhook or create alerts, but for pull request creation, you need to use the Flux notification provider with a Git platform webhook or a separate tool.

One approach is to use a GitHub Actions workflow triggered by branch pushes:

```yaml
# .github/workflows/auto-pr.yml
name: Auto PR for Flux Image Updates
on:
  push:
    branches:
      - flux-image-updates
jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          branch: flux-image-updates
          base: main
          title: "Automated image update"
          body: "This PR was automatically created by Flux image automation."
          delete-branch: true
```

## Environment-Specific Push Branches

In multi-environment setups, you can use different push branches for each environment to maintain separate review flows:

```yaml
# Production - requires PR review
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updater-prod
  namespace: flux-system
spec:
  interval: 30m
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
      messageTemplate: 'Update production images'
    push:
      branch: flux-image-updates-prod
  update:
    path: ./clusters/production
    strategy: Setters
---
# Staging - direct push
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updater-staging
  namespace: flux-system
spec:
  interval: 15m
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
      messageTemplate: 'Update staging images'
    push:
      branch: main
  update:
    path: ./clusters/staging
    strategy: Setters
```

This setup allows staging to update automatically while production changes require a pull request review.

## Branch Protection Considerations

When pushing directly to a branch, ensure that the branch protection rules on your Git platform allow the Flux bot to push. Common issues include:

- **Required status checks**: The bot's push may be blocked if CI checks are required. You may need to exempt the bot user.
- **Required reviews**: Direct pushes will be blocked if reviews are required. Use a separate push branch instead.
- **Signed commits**: If the branch requires signed commits, configure the `signingKey` in the commit settings.

For GitHub, you can add the bot user or the deploy key to the bypass list in branch protection settings.

## Handling Merge Conflicts

When using a separate push branch, merge conflicts can occur if the main branch changes between automation runs. The controller handles this by rebasing onto the latest checkout branch state on each run.

If conflicts persist, you may see errors in the controller logs:

```bash
kubectl -n flux-system logs deployment/image-automation-controller --tail=30
```

To resolve persistent conflicts, delete the push branch and let the controller recreate it:

```bash
git push origin --delete flux-image-updates
```

## Verifying Push Branch Configuration

Check the automation status and verify commits are reaching the expected branch:

```bash
# Check automation status
flux get image update image-updater

# Verify the branch exists on the remote
git ls-remote --heads origin flux-image-updates

# Check recent commits on the push branch
git log origin/flux-image-updates --oneline -5
```

## Troubleshooting

**Push rejected with permission denied**: Verify the deploy key or token used by the GitRepository has write access. For deploy keys on GitHub, ensure the key was created with write permission enabled.

**Branch not created**: The controller only creates the branch when there are actual changes to push. If no image policies have new tags, no commit or branch will be created.

**Stale branch with old changes**: If the push branch accumulates many unmerged commits, it may diverge significantly from the main branch. Regularly merge or delete the push branch to keep it current.

Choosing the right push branch strategy depends on your team's review requirements and risk tolerance. Direct pushes provide faster deployments, while separate branches with pull requests add a review step that can catch configuration issues before they reach production.
