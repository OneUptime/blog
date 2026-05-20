# Validation Summary: How to Implement Auto-Merge Policies for ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- GitHub Actions
- GitHub CLI
- Renovate Bot
- Kubernetes manifests and Kustomize
- yq YAML processing for promotion automation

## Sources Consulted
- Renovate configuration options: https://docs.renovatebot.com/configuration-options/
- Renovate full config presets: https://docs.renovatebot.com/presets-config/
- GitHub pull request auto-merge documentation: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request
- GitHub CLI `gh pr merge` manual: https://cli.github.com/manual/gh_pr_merge
- GitHub Actions pull request event documentation: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
- Argo CD Image Updater update methods: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD CLI `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD CLI `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- yq documentation: https://mikefarah.gitbook.io/yq/

## Issues Found
- The Renovate example used `config:base`, `matchPaths`, `stabilityDays`, and `requiredStatusChecks`. Current Renovate docs recommend `config:recommended`, use `matchFileNames` for package rules scoped by file path, and use `minimumReleaseAge` instead of the legacy stability-days option. `requiredStatusChecks` is not a Renovate package rule option, so it was removed.
- The GitHub Actions auto-merge workflow used the REST pull merge endpoint, which merges immediately instead of enabling GitHub auto-merge. It also mixed a `check_suite` trigger with `pull_request`-only context values. The workflow now runs on pull request events and uses `gh pr merge --auto --squash --match-head-commit` to enable auto-merge after requirements pass.
- The GitHub Actions risk check defaulted to auto-merge unless a blocker was found, so non-image changes in dev or staging could still auto-merge. The logic now defaults to blocked and only enables auto-merge for image-only changes in dev or staging paths.
- The Argo CD Image Updater example used legacy Application annotations. Current Image Updater documentation centers configuration on the `ImageUpdater` custom resource, so the example was updated to use `spec.writeBackConfig`, `spec.applicationRefs`, and current pull request configuration.
- The staged promotion workflow had no write permissions, no Git author configuration, and a placeholder loop that could commit without making changes. It now declares the needed permissions, installs `yq`, configures the GitHub Actions bot author, copies Kustomize `images` entries, and exits cleanly when there is nothing to promote.

## Review Notes
- The `.github/auto-merge-policy.yaml` snippet is a conceptual policy file. It is technically plausible, but it still needs a real policy engine or custom workflow code to enforce it.
- Direct writes from Argo CD Image Updater to protected branches only work when repository rules allow the bot identity to push.
