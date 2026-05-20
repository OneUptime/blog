# Validation Summary: How to Implement GitOps PR-Based Deployment Workflows

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSet Pull Request generator
- Argo CD Notifications
- Kubernetes manifests and kubectl
- Kustomize
- GitHub Actions
- GitHub branch protection and GitHub CLI
- Kyverno CLI
- Kubeconform

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD ApplicationSet Pull Request generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD Notifications webhook service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Notifications templates and repo functions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- GitHub Actions workflow commands and GITHUB_OUTPUT: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions workflow syntax and job names: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Kubernetes kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kyverno CLI documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno CLI apply reference: https://main.kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kubeconform documentation: https://kubeconform.mandragor.org/docs/installation/

## Issues Found
- The PR validation workflow used `origin/main` in `git diff` after the default `actions/checkout` shallow fetch. Added `fetch-depth: 0` so the base branch history is available.
- The changed-environments output could contain newlines, which is unsafe for the simple `GITHUB_OUTPUT` `name=value` format. Converted the environment list to a space-separated value.
- The validation workflow used `kubeval`, which is outdated for current Kubernetes schema validation. Replaced it with `kubeconform` and updated the validation command.
- The validation workflow called `kyverno` without installing the Kyverno CLI. Added the official Kyverno CLI install action.
- The branch protection example referenced `validate-pr`, but the GitHub Actions status check produced by the shown workflow is the `validate` job. Updated the required status check name.
- The automated image update workflow used `kustomize` without installing it in that job. Added a setup step.
- The automated image update workflow committed changes without configuring Git author identity and used `gh pr create` without exposing an authentication token to GitHub CLI. Added Git identity configuration and `GH_TOKEN`.
- The Argo CD Notifications example defined triggers and a webhook template but did not subscribe any applications to those triggers. Added a webhook subscription so the configured notification is actually sent.

## Review Notes
The Argo CD Application and ApplicationSet API versions and fields shown are current and consistent with the official documentation. The notification example uses the generic webhook service, which is valid; teams using GitHub Apps may also consider Argo CD's GitHub notification service for commit statuses.
