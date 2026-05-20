# Validation Summary: How to Create a Restart Deployment Action in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource actions
- Argo CD CLI and REST API
- Argo CD RBAC
- Kubernetes Deployments, StatefulSets, and DaemonSets
- Kubernetes rollout restarts
- Lua scripting for Argo CD resource customizations

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD built-in Deployment restart action source: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/apps/Deployment/actions/restart/action.lua
- Argo CD built-in StatefulSet restart action source: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/apps/StatefulSet/actions/restart/action.lua
- Argo CD built-in DaemonSet restart action source: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/apps/DaemonSet/actions/restart/action.lua
- Argo CD `argocd app actions list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_list/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/rbac/
- Argo CD 3.1 upgrade notes for the v2 resource actions API: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/upgrading/3.0-3.1/
- Argo CD v3 API client type reference for `ResourceActionRunRequestV2`: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/pkg/apiclient/application#ResourceActionRunRequestV2
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes well-known annotation reference for `kubectl.kubernetes.io/restartedAt`: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubectl-kubernetes-io-restartedat

## Issues Found
- The post implied Argo CD does not already provide restart actions for Deployments, StatefulSets, and DaemonSets. Current Argo CD includes these built-in actions, so the introduction and conclusion were updated to describe the configuration as customization rather than basic enablement.
- The custom snippets used `tostring(os.time())`, producing a Unix epoch string instead of the timestamp format used by kubectl and Argo CD's built-in restart action. Updated all restart snippets to use `os.date("!%Y-%m-%dT%XZ")` and corrected the Lua explanation.
- Defining `resource.customizations.actions.apps_Deployment` without `mergeBuiltinActions: true` can override built-in actions for that resource kind. Added `mergeBuiltinActions: true` to the custom action snippets so other built-in actions remain available on current Argo CD versions.
- The REST API example used the deprecated v1 actions endpoint with a JSON body shape that matches the newer request fields. Updated it to use `/api/v1/applications/my-app/resource/actions/v2` with `name`, `resourceName`, `group`, `kind`, `namespace`, and `action` in the JSON body.
- The auto-sync explanation said auto-sync alone would resolve the annotation drift. Argo CD live-state drift correction depends on automated sync with self-healing, so the wording was corrected.

## Review Notes
The CLI examples and RBAC action paths match the current Argo CD command and RBAC documentation. The `ignoreDifferences` JSON pointer for the restart annotation is technically correct.
