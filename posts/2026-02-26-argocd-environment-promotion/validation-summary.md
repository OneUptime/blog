# Validation Summary: How to Implement Environment Promotion with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes
- Kustomize
- Helm values
- GitHub Actions
- GitHub CLI
- yq
- Git
- Prometheus query API

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD CLI `app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD CLI `app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater image configuration and update strategies: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods and Git write-back target: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl run` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- GitHub Actions workflow syntax for `workflow_dispatch`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions documentation for using GitHub CLI in workflows: https://docs.github.com/actions/using-workflows/using-github-cli-in-workflows
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Kustomize repository structure described per-environment `version.yaml` files, but the CI examples used `kustomize edit set image`, which updates the environment's `kustomization.yaml` `images` field. Updated the repository structure and example snippet to use `kustomization.yaml` with `images`.
- The production PR example used `gh pr create` in GitHub Actions without setting `GH_TOKEN`. Added an `env` block using the same configured token so the GitHub CLI can authenticate in workflow automation.
- The Argo CD Image Updater snippet used legacy Application annotations and the deprecated `latest` strategy name. Replaced it with the current `ImageUpdater` custom resource format and `newest-build` update strategy.
- The Image Updater Git write-back target was corrected to the current `writeBackConfig.gitConfig.writeBackTarget` field layout.

## Review Notes
The remaining examples are illustrative and assume required tooling, credentials, Argo CD login context, Kubernetes access, and network access to Prometheus are already configured in the CI environment.
