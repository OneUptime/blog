# Validation Summary: How to Fix ArgoCD Application Health 'Unknown'

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Custom Resource Definitions (CRDs)
- Lua health checks
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd admin settings resource-overrides health` command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo CD `argocd-cmd-params-cm.yaml` documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD resource customizations source tree: https://github.com/argoproj/argo-cd/tree/master/resource_customizations
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources

## Issues Found
- The wildcard health check example used the `resource.customizations.health.<group>_<kind>` key form, which does not support wildcards. Changed it to use the `resource.customizations` key with a wildcard GVK entry and noted the limitation.
- The "ignore health" section described returning `Healthy` as ignoring health entirely. Clarified that this marks the resource healthy, added the official `argocd.argoproj.io/ignore-healthcheck` annotation for ignoring a child resource's health impact, and clarified that `resource.exclusions` excludes resources from Argo CD tracking.
- The standard-resource troubleshooting section said a newly created resource with no populated status could cause Unknown health. For standard resources with built-in health checks, that is more likely to be Progressing or another assessed state, so this was changed to health-check read errors.
- The testing section only showed applying the ConfigMap and checking the app. Added the official `argocd admin settings resource-overrides health` command for local Lua health-check assessment before applying the ConfigMap.
- The summary stated that restarting the application controller is required after adding health checks. Changed this to restart only if the status does not update.

## Review Notes
The local workspace did not have `argocd` or `kubectl` installed, so CLI verification was performed against official command references rather than local `--help` output. The listed built-in health check examples are version-dependent; users should verify against the Argo CD version they run.
