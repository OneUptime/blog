# Validation Summary: How to Use flux trace Command for Resource Tracing

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kustomization
- HelmRelease
- GitRepository
- HelmRepository
- Bash scripting

## Sources Consulted
- Flux CLI `flux trace` documentation: https://fluxcd.io/flux/cmd/flux_trace/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `flux logs` documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux source code for `flux trace`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/trace.go

## Issues Found
- The custom resource example used both a resource type positional argument and `--kind` / `--api-version`. Current `flux trace` requires the object name only when `--kind` and `--api-version` are supplied, so the command was changed to `flux trace my-cert -n my-namespace --api-version=cert-manager.io/v1 --kind=Certificate`.
- The sample `flux trace` output used `Ready:` fields, but current Flux trace output reports `Revision`, `Status`, and `Message` lines from reconciliation status conditions. The Kustomization, GitRepository, HelmRelease, and HelmRepository examples were updated accordingly.
- The Helm-managed resource example omitted the generated `HelmChart` object that appears in the trace path for HelmRelease resources using `.spec.chart`. The sample output was updated to include it.
- The automated Bash check looked for `Ready:.*False`, which no longer matches the current trace output. It now checks for `Last reconciliation failed` or `failed to trace`.
- The post said `flux get kustomizations` shows the dependency hierarchy. Official CLI docs describe it as a status listing command, so that sentence was changed to say it shows Kustomization readiness across the namespace.
- The troubleshooting list referred to "server-side apply labels" being modified. The labels used by `flux trace` are Flux ownership labels, so that wording was corrected.

## Review Notes
The `flux trace`, `flux events`, and `flux logs` commands are marked as preview in the official Flux CLI documentation, so output and flags may change in future Flux releases.
