# Validation Summary: How to Configure Flux Image Automation to Auto-Update Container Tags in Git

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- GitOps
- GitHub Actions
- GitHub CLI
- Slack notifications via Flux notification-controller

## Sources Consulted
- Flux install CLI documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux image update CLI documentation: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- GitHub CLI `gh pr list` manual: https://cli.github.com/manual/gh_pr_list
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- GitHub Actions workflow syntax permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The `flux install` example used `--components` with the full default controller list plus image controllers. Changed it to `--components-extra=image-reflector-controller,image-automation-controller`, which is the current documented way to add image automation controllers to the default install set.
- The alphabetical and numerical policy comments described sort order incorrectly. Flux selects the last tag after sorting in the configured order, so ascending order selects the highest lexicographic or numeric value. Updated the comments and the numerical example.
- The `production-only` filter passed tags such as `v1.2.3-prod` directly to a semver policy. Changed the regex to extract only the semantic version before evaluation.
- The ImageUpdateAutomation commit template used the removed `.Updated` template data. Replaced it with `.Changed.FileChanges` and `.Changed.Objects`, matching the current API.
- The staging ImageUpdateAutomation omitted `.spec.git.commit.author`, which is required. Added the same Flux bot author used elsewhere in the post.
- The PR-based update wording said Flux opens pull requests directly. Clarified that Flux pushes to a branch and the GitHub Action creates the pull request.
- The GitHub Action example used an older checkout action and an unsuitable create-pull-request flow for an already-pushed Flux branch. Replaced it with `actions/checkout@v4` and `gh pr list` / `gh pr create`, with explicit job permissions.
- The ImagePolicy status JSONPath referenced `.status.latestImage`, which is not the current v1 status field. Changed it to read `.status.latestRef.name` and `.status.latestRef.tag`.
- The notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider, while current Flux docs show Alert and Provider as `v1beta3`. Updated the API versions and added the Slack API address for the bot-token provider form.
- The troubleshooting command was labeled as listing all tags but only returned a tag count. Updated the text and added a separate command to show the sampled `latestTags` status field.

## Review Notes
- The examples assume a Flux `GitRepository` named `flux-system` already exists and has push credentials. That is normal in a bootstrapped Flux setup, but users may need to adapt the source name and credentials for their repository.
- The Slack notification example now uses the Slack bot token flow; users using legacy incoming webhooks should instead store the webhook URL in a Secret `address` key as described in the Flux Provider docs.
