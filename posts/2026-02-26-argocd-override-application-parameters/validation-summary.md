# Validation Summary: How to Override Application Parameters in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kustomize
- Kubernetes Application manifests
- GitOps workflows
- Argo CD CLI

## Sources Consulted
- Argo CD Parameter Overrides documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/parameters/
- Argo CD Helm user guide and value precedence: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_unset/

## Issues Found
- The CLI example used `--values` with inline YAML content. The official CLI uses `--values` for Helm values files and `--values-literal-file` to import a literal Helm values block from a file or URL. Changed the example to use `--values-literal-file values-override.yaml`.
- The Kustomize name prefix CLI example used `--kustomize-name-prefix`, which is not the documented flag. Changed it to `--nameprefix`.
- The UI section said the Parameters tab shows all available chart values with current and default values. The official Helm documentation notes that the UI shows parameters and does not represent the complete merged values set. Updated the wording to avoid overstating the UI behavior.
- The Helm precedence list omitted `valuesObject`. Added `valuesObject` between `values` and `parameters`, matching the documented order `parameters > valuesObject > values > valueFiles > chart values.yaml`.
- The "Making Overrides Visible" section claimed Argo CD shows a warning for parameter overrides differing from Git. I could not confirm that claim in the official documentation, so I replaced it with the accurate statement that overrides are stored in the Application spec and can be queried.
- The command for removing a Helm parameter override used `argocd app unset --helm-set`, which is not a documented unset flag. Changed it to `argocd app unset backend-api -p replicaCount`.

## Review Notes
The local environment did not have the `argocd` CLI installed, so CLI validation was done against the official Argo CD command reference. The post remains version-general; behavior may vary slightly by Argo CD release, especially around UI presentation.
