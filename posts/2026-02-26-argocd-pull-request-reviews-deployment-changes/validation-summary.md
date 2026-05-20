# Validation Summary: How to Implement Pull Request Reviews for Deployment Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- kubectl
- GitHub Actions
- GitHub CLI
- TruffleHog

## Sources Consulted
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout README: https://github.com/actions/checkout
- actions/github-script README: https://github.com/actions/github-script
- GitHub CLI workflow documentation: https://docs.github.com/actions/using-workflows/using-github-cli-in-workflows
- GitHub CLI `gh pr edit` manual: https://cli.github.com/manual/gh_pr_edit
- GitHub branch protection documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- TruffleHog README and GitHub Action reference: https://github.com/trufflesecurity/trufflehog

## Issues Found
- The manifest validation loop printed `FAILED` but still allowed the job to succeed. Updated the loop to track failures and exit non-zero if any Kustomize directory fails validation.
- The TruffleHog example used `--only-verified`, which is not the current TruffleHog v3 option. Updated it to `--results=verified`.
- The GitHub API comment examples did not declare token permissions. Added explicit `permissions` blocks for read access and PR comments.
- The Argo CD diff workflow used `git diff origin/main` without fetching enough history. Added `fetch-depth: 0`.
- The Argo CD diff workflow treated the normal "diff found" exit code as a failure/no-diff condition. Updated the shell logic to fail only on Argo CD's general error exit code.
- The approval-gate section claimed to use labels but the code checked reviews. Updated the heading and lead-in text to match the implementation.
- The auto-merge blocking workflow added a label but did not actually block the check. Updated it to set `GH_TOKEN`, add the label, and exit non-zero so a required status check can prevent auto-merge.

## Review Notes
The examples are technically valid for an internal infrastructure repository. For public repositories or fork-based pull requests, workflows that need secrets, PR comments, or labels may require different event choices, token permissions, and security review before using `pull_request_target`.
