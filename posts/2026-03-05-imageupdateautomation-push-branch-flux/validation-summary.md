# Validation Summary: How to Configure ImageUpdateAutomation Push Branch in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Image Automation Controller
- Kubernetes custom resources
- GitHub Actions
- Git and branch-based pull request workflows

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for `flux get image update`: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux notification controller documentation: https://fluxcd.io/flux/components/notification/
- Flux GitHub Actions Auto PR guide: https://v2-6.docs.fluxcd.io/flux/use-cases/gh-actions-auto-pr/
- GitHub CLI pull request documentation: https://cli.github.com/manual/gh_pr_create
- peter-evans/create-pull-request concepts and guidelines: https://github.com/peter-evans/create-pull-request/blob/main/docs/concepts-guidelines.md

## Issues Found
- The post said the source-controller reconciles the cluster after a direct push to `main`. I clarified that source-controller detects the new commit, while the Flux controllers consuming the source perform the cluster reconciliation.
- The post said an existing push branch is rebased by the image-automation-controller. Current Flux documentation says the push branch is overwritten with the checked-out branch plus automation changes by default, and only with `--feature-gates=GitForcePushBranch=false` are updates calculated on top of the existing push branch. I updated the explanation accordingly.
- The GitHub Actions example used `peter-evans/create-pull-request` on a push to the Flux update branch. That action is intended to create pull requests from changes in the workflow workspace, so the example was not a reliable way to open a PR for an already-pushed Flux branch. I replaced it with a `gh pr create` workflow aligned with Flux's Auto PR guidance.
- The merge conflict section described Flux as rebasing the push branch on each run. I corrected this to explain the default refresh/overwrite behavior and the stale-branch failure mode when force push is disabled.
- The pull request automation and stale branch troubleshooting text blurred Flux notification behavior with Git platform PR creation and assumed stale push branches accumulate by default. I clarified that Flux can receive webhooks and send alerts, while PR creation needs a Git platform workflow, a custom webhook handler, or another tool, and that stale branch divergence mainly applies when force push is disabled or the branch is modified outside Flux.

## Review Notes
The Flux API examples use the current `image.toolkit.fluxcd.io/v1` API and valid fields including `.spec.git.checkout`, `.spec.git.commit.author`, `.spec.git.commit.messageTemplate`, `.spec.git.push.branch`, and `.spec.update.strategy: Setters`. The `flux get image update` command is documented as a valid alias for viewing ImageUpdateAutomation status.
