# Validation Summary: How to Create ArgoCD Resource Customizations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource customizations
- Kubernetes ConfigMaps and Application manifests
- Lua health checks and resource actions
- Argo CD diff customization
- JSON Pointers and JQ path expressions

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD argocd-cm example: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/argocd-cm-yaml/
- Argo CD Application Specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/

## Issues Found
- The post described `resource.customizations` as the main configuration shape. Updated examples to use current split ConfigMap keys such as `resource.customizations.health.<group>_<kind>`, `resource.customizations.actions.<group>_<kind>`, and `resource.customizations.ignoreDifferences.<group>_<kind>`.
- The custom health status list included `Missing` and `Unknown`, but Argo CD custom Lua health checks document `Healthy`, `Progressing`, `Degraded`, and `Suspended`. Removed the unsupported custom return values.
- The introductory explanation implied that health checks determine sync status. Updated the wording and diagram to distinguish health assessment from diff/sync comparison.
- The “Restart Deployment Action” example was configured for `argoproj.io_Rollout` and included incorrect Rollout mutations. Replaced it with a Deployment restart action using the documented `apps_Deployment` action key and pod template restart annotation.
- The StatefulSet scale action assumed `obj.spec.replicas` was always present. Added a default of `1` to avoid nil arithmetic or comparison errors.
- The Rollout health helper assumed `obj.status` was present. Added a nil check before reading `availableReplicas`.
- The cert-manager ignore-differences example used `certmanager.io_Certificate`; corrected it to `cert-manager.io_Certificate`.
- One JQ expression example returned annotation key strings rather than selecting Kubernetes object fields. Replaced it with a documented-style list-item selection expression.
- The Application example omitted `spec.project`. Added `project: default` to match normal Argo CD Application manifests.

## Review Notes
The post is now technically valid against current Argo CD documentation. Some example health checks are intentionally simplified; production checks may need controller-specific fields such as `observedGeneration`.
