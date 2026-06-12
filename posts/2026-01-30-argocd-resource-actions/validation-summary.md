# Validation Summary: How to Implement ArgoCD Resource Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource actions
- Argo CD CLI and API
- Kubernetes Deployments and StatefulSets
- Argo Rollouts
- cert-manager Certificates
- Lua scripting
- GitHub Actions

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_actions_run/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD application API protobuf definitions: https://github.com/argoproj/argo-cd/blob/master/server/application/application.proto
- Argo CD built-in Deployment action scripts: https://github.com/argoproj/argo-cd/tree/master/resource_customizations/apps/Deployment/actions
- Argo CD built-in Rollout action scripts: https://github.com/argoproj/argo-cd/tree/master/resource_customizations/argoproj.io/Rollout/actions
- Argo Rollouts restart documentation: https://argo-rollouts.readthedocs.io/en/stable/features/restart/
- Argo Rollouts specification documentation: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/

## Issues Found
- The Argo Rollouts CLI example used `promote`, which is not the current Argo CD built-in action name. Changed it to `promote-full` and added `skip-current-step` for the separate skip-step operation.
- Custom action snippets for Deployments, StatefulSets, and Rollouts would override built-in actions on current Argo CD unless configured otherwise. Added `mergeBuiltinActions: true` where custom actions are added for kinds with built-in actions.
- The scale action description claimed it demonstrated action parameters, but the snippet used separate fixed actions rather than `actionParams`. Updated the description to match the code.
- The Redis StatefulSet action used `os.date` without requiring the `os` library and assumed `obj.spec.template.metadata` existed. Added `local os = require("os")` and initialized the nested metadata table.
- The Rollout `set-weight-50` action wrote to `spec.strategy.canary.setWeight`, which is not a valid Rollout field. Changed it to update the first canary step's `setWeight` field.
- The cert-manager renewal action implied cert-manager renews certificates from a metadata annotation change. Updated it to mark a custom renewal request for external automation and noted that `cmctl renew` is cert-manager's built-in manual renewal flow.
- The REST API example used the older resource actions endpoint with a full JSON object body and omitted the required resource API version. Updated it to `/resource/actions/v2` and added `"version": "v1"`.
- The best-practices snippet used an undocumented `description` action key. Replaced it with documented `displayName` and `iconClass` fields.

## Review Notes
The post is now technically accurate for current Argo CD documentation. The custom actions remain examples that mutate live resources, so readers should still consider GitOps drift, Argo CD RBAC, project permissions, and whether action-created or action-mutated resources should be reconciled back into Git.
