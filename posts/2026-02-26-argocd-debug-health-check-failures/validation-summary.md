# Validation Summary: How to Debug Health Check Failures in ArgoCD

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- Lua custom health checks
- Kubernetes ConfigMaps

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The post used `argocd app resources my-app --output json`, but current Argo CD documentation lists only `tree` and `tree=detailed` output formats for `argocd app resources`. Changed this to `argocd app get my-app --output json`, which is the documented command for retrieving application details in JSON.
- The post combined `--refresh` and `--hard-refresh` in a single `argocd app get` command. Since `--hard-refresh` already refreshes application data and the target manifests cache, changed the example to use only `--hard-refresh`.
- The wildcard custom health check example used invalid `resource.customizations.health.*...` ConfigMap keys. Argo CD documents that wildcards are supported under `resource.customizations`, not under the flat `resource.customizations.health.<group>_<kind>` key format. Updated the YAML example accordingly.
- The Lua string comparison example suggested handling whitespace/casing and used `tostring(obj.status.phase)` without guarding `obj.status`. Updated the example to check `obj.status` and `obj.status.phase` before comparing the exact phase value.

## Review Notes
Argo CD disables Lua standard libraries by default for custom health checks unless `resource.customizations.useOpenLibs.<group>_<kind>` is enabled. Future expansions that use Lua `string.*`, `os`, `io`, or other standard-library functions should mention that requirement explicitly.
