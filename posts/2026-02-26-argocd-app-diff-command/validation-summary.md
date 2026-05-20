# Validation Summary: How to Use argocd app diff to Preview Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD CLI
- Kubernetes manifests and diffing
- GitOps workflows
- GitHub Actions
- Bash scripting

## Sources Consulted
- Argo CD official `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD official diff strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD official diffing customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD official `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- GitHub Actions official workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions official expressions documentation: https://docs.github.com/en/actions/learn-github-actions/expressions
- `actions/github-script` official repository: https://github.com/actions/github-script

## Issues Found
- The server-side diff command used `argocd app diff my-app --server-side`, but the current official Argo CD CLI flag is `--server-side-diff`. Updated the command accordingly.
- The server-side diff explanation said mutating webhook modifications are always accounted for. Argo CD documentation says mutation webhook changes are not included by default and require `IncludeMutationWebhook=true`. Updated the bullet list to reflect that behavior.
- The GitHub Actions `github-script` example used raw Markdown triple backticks inside a JavaScript template literal, which would terminate the string and make the script invalid. Rewrote the comment body construction with an array join.
- The GitHub Actions `github-script` example interpolated the diff output directly into JavaScript. Updated it to use `toJSON(steps.diff.outputs.diff)` so multiline diff output is represented as a valid JavaScript string.
- The GitHub Actions `github-script` example did not await the REST API call. Added `await` so the action waits for the PR comment request to complete.

## Review Notes
- The `argocd app diff` command reference notes that Kubernetes Secrets are ignored from this diff. The post does not mention that caveat, but the existing examples and claims remain technically correct after the fixes above.
