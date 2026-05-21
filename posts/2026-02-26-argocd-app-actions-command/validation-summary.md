# Validation Summary: How to Use argocd app actions to Execute Actions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD CLI
- Argo CD resource actions
- Argo CD RBAC
- Kubernetes ConfigMaps
- Lua resource action scripts
- jq and shell scripting

## Sources Consulted
- Argo CD `argocd app actions` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions/
- Argo CD `argocd app actions list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_list/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app get-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get-resource/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The `argocd app actions run` examples used a non-existent `--action` flag. Updated all run examples and scripts to use the documented positional syntax: `argocd app actions run APPNAME ACTION [flags]`.
- The built-in actions list and example incorrectly described `retry` as a Job action. Updated the post to describe retry for Argo Rollouts and suspend/resume/terminate for Jobs.
- The core Pod custom action key used `resource.customizations.actions._Pod`. Updated it to `resource.customizations.actions.Pod`, matching the documented no-group customization key format.
- The automation script used unsupported `argocd app resources --kind ... -o json` flags. Updated it to use `argocd app get "$APP_NAME" -o json` and filter `.status.resources` with `jq`.
- The troubleshooting section used unsupported `argocd app resources --kind --resource-name` flags. Updated it to use `argocd app get-resource`, which supports those filters.

## Review Notes
The local environment did not have the `argocd` CLI installed, so command validation was performed against the official Argo CD command reference. The post does not pin an Argo CD version; the reviewed commands and configuration match the current stable documentation.
