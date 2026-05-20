# Validation Summary: How to Enable and Disable Resource Actions per Resource Type in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource actions
- Argo CD RBAC
- Kubernetes ConfigMaps
- Lua custom action scripts
- kubectl JSON patch

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD built-in Deployment restart action source: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/apps/Deployment/actions/restart/action.lua
- Argo CD built-in StatefulSet restart action source: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/apps/StatefulSet/actions/restart/action.lua

## Issues Found
- The post originally said that removing or omitting `resource.customizations.actions.<group>_<kind>` disables all actions for a resource type. Argo CD has built-in actions for several resource types, and the official documentation states that defining a custom resource action customization overrides built-ins unless `mergeBuiltinActions: true` is used. I changed the wording to distinguish custom ConfigMap-defined actions from built-in actions.
- The RBAC test commands omitted the `applications` resource argument required by `argocd admin settings rbac can ROLE/SUBJECT ACTION RESOURCE [SUB-RESOURCE]`. I updated the examples to include `applications` before the `<project>/<app>` object selector.
- The complete example described StatefulSets as having no actions, but the snippet still defined an enabled `restart` action. I changed the StatefulSet customization to return an empty actions table with `definitions: []`.

## Review Notes
- The local environment did not have the `argocd` CLI installed, so CLI syntax was verified against the official command reference rather than local `--help` output.
- The Lua restart examples use the same general annotation mutation pattern as Argo CD's built-in restart actions. The built-in scripts use an RFC3339-style timestamp from `os.date`; the blog's use of `os.time()` still changes the pod template annotation and triggers rollout behavior, but matching the built-in timestamp format would be a future consistency improvement.
