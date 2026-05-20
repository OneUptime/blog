# Validation Summary: How to Implement the Monorepo Pattern with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- GitOps
- Kubernetes
- Kustomize
- Helm
- GitHub Actions
- CODEOWNERS

## Sources Consulted
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/applicationset/Generators-Git/
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD high availability and monorepo scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD repo add command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD command parameters documentation: https://argo-cd.readthedocs.io/en/release-3.3/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- actions/checkout documentation: https://github.com/actions/checkout

## Issues Found
- The ApplicationSet examples used older/non-current template expressions such as `{{path}}`, `{{path.basename}}`, and `{{path[2]}}`. Updated both examples to use `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, `{{.path.path}}`, `{{.path.basename}}`, and `{{index .path.segments 2}}` in line with current Argo CD documentation.
- The Helm `valueFiles` example used `../../../services/...`, which resolves above the repository root from `charts/microservice`. Changed it to `../../services/...`, which is the correct relative path from the chart root.
- The Kustomize resource-limits patch was written as a strategic merge patch with placeholder resource and container names, which would not reliably patch the target Deployment's container. Changed it to a JSON 6902 patch that targets the first container's `resources` field via the existing `patches.target`.
- The shallow clone section used `ARGOCD_GIT_SHALLOW_DEPTH`, which is not the documented Argo CD configuration. Replaced it with the documented repository Secret `depth: "1"` option.
- The webhook section said Argo CD did not have to poll while still configuring periodic reconciliation. Changed the wording to clarify that webhooks avoid waiting for the next poll and changed the example interval to `15m`, matching Argo CD's documented guidance for reducing polling frequency when webhooks are used.
- The path-based filtering section implied Argo CD automatically skips unrelated paths just because each Application has a specific source path. Updated it to require the documented `argocd.argoproj.io/manifest-generate-paths` annotation.
- The GitHub Actions workflow referenced `kubeval` but only installed Kustomize. Updated it to install and use `kubeconform`, moved Kustomize into `PATH`, added `fetch-depth: 0` for reliable `origin/main...HEAD` diffs, and fixed multiline `$GITHUB_OUTPUT` syntax.

## Review Notes
The examples are now aligned with current Argo CD documentation. Future improvements could include pinning tool versions in the GitHub Actions workflow instead of downloading latest releases.
