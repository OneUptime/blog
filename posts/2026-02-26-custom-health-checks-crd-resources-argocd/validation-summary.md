# Validation Summary: How to Use Custom Health Checks for CRD Resources in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes Custom Resource Definitions
- Kubernetes ConfigMaps
- Lua health check scripts
- Argo CD CLI
- GitOps sync waves

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd admin settings resource-overrides health` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo CD troubleshooting tools documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/troubleshooting/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD GitOps Engine health package reference: https://pkg.go.dev/github.com/argoproj/gitops-engine/pkg/health
- Argo CD GitOps Engine health source: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health.go

## Issues Found
- The post incorrectly said ArgoCD applies a generic health check to unknown resource types by reading `.status.conditions`. Argo CD documents built-in checks for selected resources and custom Lua checks for unsupported resources; the GitOps Engine source returns no built-in health check for unsupported GVKs. Updated the default-health explanation to say unsupported custom resources require configured or built-in health checks for ArgoCD to understand readiness.
- The post said ArgoCD might mark the sample custom database resource as Healthy simply because it exists. Updated this to say ArgoCD cannot infer readiness from those custom fields without a health check.
- The Lua health check API section listed `Missing` as a status to return from custom Lua scripts and described `hs.message` as required. Argo CD's custom health documentation lists `Healthy`, `Progressing`, `Degraded`, and `Suspended` for custom checks and describes `message` as optional. Updated the API description while keeping a note that ArgoCD uses `Missing` when a resource does not exist.
- The local testing example wrote `health.lua` but then ran the Argo CD CLI against `argocd-cm.yaml`, which the example had not created. Updated the example to create a valid `argocd-cm.yaml` containing `resource.customizations.health.databases.example.com_PostgresCluster`, then test a sample `resource.yaml` with `argocd admin settings resource-overrides health`.

## Review Notes
The Lua examples are syntactically consistent with Argo CD's documented Lua health check pattern. The local environment did not have the `argocd` CLI or Lua interpreter installed, so command execution and Lua parsing could not be run locally; CLI syntax was verified against the official Argo CD command reference.
