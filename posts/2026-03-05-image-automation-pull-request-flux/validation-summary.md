# Validation Summary: How to Configure Image Automation with Pull Request Creation in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-automation-controller
- Flux notification-controller
- Kubernetes custom resources
- GitHub Actions
- GitHub CLI
- GitOps pull request workflows

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux GitHub Actions Auto Pull Request guide: https://v2-6.docs.fluxcd.io/flux/use-cases/gh-actions-auto-pr/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux reconcile image update` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- GitHub CLI `gh pr list` manual: https://cli.github.com/manual/gh_pr_list
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`. Current Flux documentation exposes `Provider` and `Alert` as `notification.toolkit.fluxcd.io/v1beta3`; the `v1` notification API reference covers `Receiver`, not `Provider` or `Alert`. Updated both snippets to `v1beta3`.
- The alert example claimed to fire when ImageUpdateAutomation pushes, but without filtering it could forward other events from the automation resource. Added `eventSeverity: info` and an `inclusionList` matching the Flux push event message so the webhook is limited to pushed-commit events.
- The GitHub Actions example used `peter-evans/create-pull-request` on a branch that Flux had already committed and pushed. That action is designed to create commits from workspace changes and then open/update a PR, so it is not the right fit for opening a PR from an existing Flux-managed branch. Replaced it with a `gh pr list` / `gh pr create` workflow that creates the PR from `flux-image-updates` to `main` when one does not already exist.
- The text before the GitHub CLI script said it was for GitLab or other providers while using the GitHub CLI. Adjusted the wording to make clear that the script is GitHub-specific and other providers need equivalent CLI/API calls.
- The GitHub CLI script passed labels as a single comma-separated `--label` value. Updated it to repeat `--label` for each label, matching the current `gh pr create` flag contract.

## Review Notes
The core Flux `ImageUpdateAutomation` example, including `apiVersion: image.toolkit.fluxcd.io/v1`, `spec.git.checkout.ref.branch`, `spec.git.push.branch`, `spec.git.commit.author`, `spec.git.commit.messageTemplate`, `spec.update.path`, `spec.update.strategy: Setters`, and `.status.lastPushCommit`, matches current Flux documentation. Flux's default push-branch behavior is force-push based, but Flux documents a `GitForcePushBranch=false` feature gate that changes this behavior; the post's explanation is correct for the default controller configuration.
