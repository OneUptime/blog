# Validation Summary: How to Use argocd admin Tools for Troubleshooting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes
- GitOps
- RBAC
- Argo CD Notifications
- Lua resource health customizations

## Sources Consulted
- Argo CD `argocd admin` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin/
- Argo CD `argocd admin settings validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_validate/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD resource override command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides/
- Argo CD resource override health command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo CD resource override ignore-differences command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_ignore-differences/
- Argo CD resource override list-actions command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_list-actions/
- Argo CD export command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_export/
- Argo CD import command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD disaster recovery documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/disaster_recovery/
- Argo CD app generate-spec command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_app_generate-spec/
- Argo CD cluster stats command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_cluster_stats/
- Argo CD cluster generate-spec command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_cluster_generate-spec/
- Argo CD notifications template command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_notifications_template/
- Argo CD notifications trigger command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_notifications_trigger/
- Argo CD repository generate-spec command reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/commands/argocd_admin_repo_generate-spec/
- Argo CD CLI v3.4.2 `--help` output for affected `argocd admin` subcommands.

## Issues Found
- The access section said some `argocd admin` commands run against the Argo CD API server, but the current command reference describes `argocd admin` as administrator commands that generally require direct Kubernetes access. Updated the wording to avoid implying normal API-server-only operation.
- `argocd admin settings validate --namespace argocd` was missing `--load-cluster-settings` for validating settings loaded from the Kubernetes cluster. Added `--load-cluster-settings` to the examples and diagnostic script.
- `argocd admin settings resource-overrides list` is not a current subcommand. Replaced it with `argocd admin settings validate --group resource-overrides` where the post meant validation.
- Resource override `health`, `ignore-differences`, and action examples used resource type names such as `deployment` and `argoproj.io/Rollout`, but the current CLI expects a resource YAML file path. Updated these examples to use `./deployment.yaml` and `./rollout.yaml`.
- `argocd admin settings resource-overrides action list` is not the current command form. Changed it to `argocd admin settings resource-overrides list-actions`.
- `argocd admin import --namespace argocd < argocd-backup.yaml` omitted the required source argument. Changed it to `argocd admin import - --namespace argocd < argocd-backup.yaml`, matching the documented stdin form.
- The "export only applications" example used `grep` over a YAML stream, which is not a reliable way to select Kubernetes resources. Replaced it with `kubectl get applications.argoproj.io -n argocd -o yaml`.
- `argocd admin app generate-spec my-app --namespace argocd` was described as listing application status, but the command generates declarative application config. Updated the comment and provided a complete generate-spec example with repo, path, destination namespace, and destination server.
- `argocd admin cluster generate-spec my-cluster --namespace argocd` misused `--namespace`, which is a managed namespace option for the generated cluster config rather than the Argo CD control plane namespace. Changed the example to `argocd admin cluster generate-spec my-cluster -o yaml`.
- `argocd admin notifications template list` and `argocd admin notifications trigger list` are not current subcommands. Replaced them with `template get` and `trigger get`.
- `argocd admin repo list` and `argocd admin repo validate` are not current admin repo subcommands. Replaced the section with the supported `argocd admin repo generate-spec` command.

## Review Notes
- The RBAC resource/action table in the official documentation uses plural RBAC resource names such as `applications`, `projects`, `clusters`, and `repositories`, so the RBAC loop examples are consistent with the documented RBAC model.
- The Argo CD disaster recovery documentation still supports `argocd admin export` and `argocd admin import -` for backup and restore workflows.
- Some `argocd admin` commands are sensitive to the Argo CD CLI version; this review checked the stable command reference and Argo CD CLI v3.4.2 help output.
