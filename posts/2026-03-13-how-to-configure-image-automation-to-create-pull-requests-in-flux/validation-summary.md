# Validation Summary: How to Configure Image Automation to Create Pull Requests in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux ImageUpdateAutomation
- Kubernetes custom resources
- GitHub Actions
- GitHub CLI
- GitLab CI
- GitLab Merge Requests API
- GitOps

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux GitHub Actions Auto Pull Request guide: https://v2-6.docs.fluxcd.io/flux/use-cases/gh-actions-auto-pr/
- Flux CLI `flux get images update` documentation: https://fluxcd.io/flux/cmd/flux_get_images_update/
- GitHub Actions workflow permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- GitHub CLI `gh pr edit` manual: https://cli.github.com/manual/gh_pr_edit
- GitHub CLI `gh pr list` manual: https://cli.github.com/manual/gh_pr_list
- GitHub CLI `gh pr merge` manual: https://cli.github.com/manual/gh_pr_merge
- GitLab Merge Requests API documentation: https://docs.gitlab.com/api/merge_requests/
- GitHub branch protection documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

## Issues Found
- The Flux commit message template used `.Changed.Objects` as if each key had a nested `.Resource` field. Current Flux documentation shows `.Changed.Objects` keys are object identifiers with `Kind` and `Name` fields directly. Updated the template to use `$resource.Kind` and `$resource.Name`.
- The GitHub Actions example used `peter-evans/create-pull-request` against a branch that Flux had already pushed. That action is designed to create or update a PR from workspace changes, while the Flux-documented pattern is to open a PR from the pushed image-update branch. Replaced the workflow step with GitHub CLI commands that create a PR when none exists and update the existing PR body, labels, and reviewer when one is already open.
- The auto-merge example depended on the `peter-evans/create-pull-request` output from the removed action. Updated it to find the existing PR with `gh pr list` and pass the PR number to `gh pr merge --auto --squash`.

## Review Notes
The GitLab CI example creates a merge request when none is open, but does not update the body or metadata of an existing merge request. That is technically valid for the stated alternative, but a production workflow may want to update existing merge request details on subsequent Flux pushes.
