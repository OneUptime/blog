# Validation Summary: How to Use argocd admin Commands for Troubleshooting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes
- GitOps
- Bash scripting
- Kubernetes Secrets, ConfigMaps, and CRDs

## Sources Consulted
- Argo CD `argocd admin` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin/
- Argo CD `argocd admin settings` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings/
- Argo CD `argocd admin settings validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_validate/
- Argo CD RBAC command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD resource override command references: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_ignore-differences/
- Argo CD cluster command references: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_cluster/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_cluster_generate-spec/
- Argo CD import/export command references: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_export/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD password reset FAQ and bcrypt command reference: https://argo-cd.readthedocs.io/en/latest/faq/ and https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_bcrypt/
- Argo CD application and repository admin command references: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_app/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_repo_generate-spec/
- Argo CD notifications command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_notifications_template_notify/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/

## Issues Found
- Replaced nonexistent `argocd admin settings resource-overrides list` with `argocd admin settings validate --load-cluster-settings --namespace argocd`.
- Added the required resource YAML path to `resource-overrides health` and `resource-overrides ignore-differences`; these commands require `RESOURCE_YAML_PATH`.
- Replaced nonexistent `argocd admin cluster list` and `argocd admin cluster stats` commands with direct Kubernetes cluster-secret listing and the documented `argocd admin cluster namespaces` command.
- Corrected the cluster `generate-spec` description and removed `--namespace argocd`, because that flag means managed namespaces for the generated cluster spec, not the Argo CD control-plane namespace.
- Fixed `argocd admin import` examples to pass the required `SOURCE` argument, using `-` for stdin and a filename for file import.
- Corrected the password reset example to use `argocd account bcrypt --password` for generating the bcrypt hash instead of `argocd admin initial-password`, which only prints the initial password.
- Replaced nonexistent `argocd admin app list` and `argocd admin app diff` examples with `kubectl get applications` and the documented `argocd admin app generate-spec` command.
- Replaced nonexistent `argocd admin repo generate-manifests` with the documented `argocd admin repo generate-spec` command and adjusted the surrounding wording.
- Corrected the notifications example to use documented positional arguments and in-cluster settings rather than treating `--config-map` and `--secret` as Kubernetes object names; those flags expect file paths when supplied.

## Review Notes
The performance snippets use documented Argo CD metrics ports, but in production it is usually more robust to scrape the metrics Services or use `kubectl port-forward` than to rely on `curl` being present inside Argo CD component containers.
