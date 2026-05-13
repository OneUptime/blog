# Validation Summary: How to Configure Image Automation to Commit to Separate Branch in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux Image Automation Controller
- Flux ImageUpdateAutomation
- Flux GitRepository
- Kubernetes custom resources
- Git branching
- GitHub Actions and GitHub CLI

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI `flux create image update` documentation: https://fluxcd.io/flux/cmd/flux_create_image_update/
- GitHub CLI pull request creation manual: https://cli.github.com/manual/gh_pr_create
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- peter-evans/create-pull-request documentation, consulted to verify the original workflow behavior: https://github.com/peter-evans/create-pull-request

## Issues Found
- The workflow explanation said that if the push branch already has the same changes, no new commit is made. Flux documentation states that, by default, an existing push branch is updated from the checkout branch plus controller changes and is force-pushed unless `GitForcePushBranch=false` is configured. I changed the step to describe the default force-push behavior.
- The GitHub Actions example used `peter-evans/create-pull-request` after checking out the already-updated Flux branch. That action is intended to create or update pull requests from changes made in the workflow workspace, so the example could silently do nothing or behave unexpectedly for an already-pushed branch. I replaced it with a GitHub CLI example that creates a pull request from `flux-image-updates` to `main` and skips creation if the PR already exists.

## Review Notes
The Flux API snippets use the current `image.toolkit.fluxcd.io/v1` and `source.toolkit.fluxcd.io/v1` APIs. The `spec.git.checkout.ref.branch`, `spec.git.commit.author`, `spec.git.push.branch`, and `update.strategy: Setters` fields match current Flux documentation. The verification commands are plausible; the Flux CLI was not installed in the local environment, so CLI syntax was checked against official Flux documentation instead of local `--help` output.
