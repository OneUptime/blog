# Validation Summary: How to Use Parameter Overrides with Helm in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD CLI
- Helm values and parameters
- Kubernetes manifests and Secrets
- GitOps workflows

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_unset/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Helm `--set` format and limitations documentation: https://helm.sh/docs/intro/using_helm/#the-format-and-limitations-of---set

## Issues Found
- The post claimed ArgoCD provides exactly three ways to override Helm values and that the guide covered every method. Argo CD also supports `valuesObject` and file parameters, so the wording was changed to describe the three covered approaches as common methods rather than an exhaustive list.
- The Helm value precedence list omitted `valuesObject`. Updated the order to match the official Argo CD precedence: `parameters > valuesObject > values > valueFiles > helm repository values.yaml`.
- The CLI example for setting inline values used `argocd app set --values` with an inline YAML string. The `--values` flag is for values files; the example was corrected to use `--values-literal-file`.
- The cross-repository values file example did not mention the Argo CD version requirement. Added that multi-source values files from a separate repository require Argo CD v2.6 or later.
- The removal examples used unsupported `argocd app unset --helm-set`, `--helm-set-all`, and `--values` forms. Updated them to use `-p` for parameter overrides and `--values-literal` for the inline values block.

## Review Notes
The examples remain intentionally generic and depend on chart-specific values keys such as `existingSecret` and `existingSecretPasswordKey`; these are valid patterns only when the target chart supports those values.
