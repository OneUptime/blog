# Validation Summary: How to Write Custom Health Check Scripts in Lua for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource health checks
- Argo CD `argocd-cm` resource customizations
- Kubernetes ConfigMaps and custom resources
- Lua health check scripts
- Argo CD CLI

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd admin settings resource-overrides health` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo CD GitOps Engine health package reference: https://pkg.go.dev/github.com/argoproj/argo-cd/gitops-engine/pkg/health
- Argo CD GitOps Engine health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health.go

## Issues Found
- The post said custom resources default to `"Healthy"` simply because they exist, and the diagram showed `"Return Healthy by Default"`. Official Argo CD documentation says resources without specific health logic do not have that simple default, and the health implementation returns no built-in result when no health check exists. I changed the wording and diagram to say Argo CD may not have a useful built-in way to evaluate those resources and that there may be no resource-specific health assessment.
- The script contract listed health statuses but omitted `"Unknown"` while a later example returned `"Unknown"`. The Argo CD health package defines `"Unknown"` and `"Missing"` as resource health statuses. I updated the wording to list the usual custom-check return values and note that Argo CD also uses `"Missing"` and `"Unknown"`.
- The CLI test command used `argocd admin settings resource-health`, which is not the current documented command. I changed it to `argocd admin settings resource-overrides health`.

## Review Notes
The local environment did not have the `argocd` CLI installed, so CLI verification was performed against the official Argo CD command reference. The Lua examples are syntactically valid in the context of Argo CD health scripts, and the `resource.customizations.health.<group>_<kind>` ConfigMap key format matches current Argo CD documentation.
