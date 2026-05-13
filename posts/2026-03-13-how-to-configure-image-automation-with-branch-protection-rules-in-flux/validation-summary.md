# Validation Summary: How to Configure Image Automation with Branch Protection Rules in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux ImageUpdateAutomation
- Flux GitRepository authentication
- GitHub branch protection
- GitHub Actions
- GitHub CLI
- Kubernetes kubectl
- Kustomize
- Conftest

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub GITHUB_TOKEN documentation: https://docs.github.com/en/actions/concepts/security/github_token
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- GitHub CLI `gh pr merge` manual: https://cli.github.com/manual/gh_pr_merge
- GitHub auto-merge documentation: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request

## Issues Found
- The Flux commit message template used `.Changed.Changes`, which is not the current documented template structure. Updated it to iterate over `.Changed.Objects` and the per-resource changes.
- The GitHub Actions PR creation example used `GITHUB_TOKEN`, but PRs created by `GITHUB_TOKEN` do not trigger normal downstream workflow runs such as `pull_request` CI checks. Updated the example to use a GitHub App installation token or PAT secret (`FLUX_PR_TOKEN`) and added the required caveat.
- The auto-merge section claimed to use a GitHub App token but used `GITHUB_TOKEN` and checked for `github.actor == 'flux-bot[bot]'`, which would not reliably match PRs created by the automation workflow. Updated it to use `FLUX_PR_TOKEN`, added workflow permissions, and scoped the condition to the Flux update branch.
- The signed commit section omitted the required Flux signing secret data key. Added a note that the secret must contain the ASCII-armored PGP private key in `git.asc`, plus `passphrase` when needed.
- The status check section said checks would run unconditionally on the automated PR. Updated it to clarify that this depends on creating the PR with a GitHub App installation token or PAT rather than `GITHUB_TOKEN`.

## Review Notes
The Flux `ImageUpdateAutomation` API version, `git.checkout`, `git.push.branch`, `commit.signingKey.secretRef`, SSH `GitRepository` authentication fields, and `Setters` update strategy match current Flux documentation. The `kubectl`, `gh pr create`, and `gh pr merge --auto --squash` command forms are current.
