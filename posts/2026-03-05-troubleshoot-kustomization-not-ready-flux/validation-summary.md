# Validation Summary: How to Troubleshoot Kustomization Not Ready Status in Flux

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux Kustomization API
- Kubernetes
- Kustomize
- kubectl
- jq

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux `get kustomizations` CLI source showing `ks` alias: https://github.com/fluxcd/flux2/blob/main/cmd/flux/get_kustomization.go
- Flux `reconcile kustomization` CLI source showing `ks` alias: https://github.com/fluxcd/flux2/blob/main/cmd/flux/reconcile_kustomization.go
- Flux `get sources` CLI source showing `source` alias: https://github.com/fluxcd/flux2/blob/main/cmd/flux/get_source.go
- Flux Kustomization API source for timeout defaults: https://github.com/fluxcd/kustomize-controller/blob/main/api/v1/kustomization_types.go

## Issues Found
- The timeout example said it increased the timeout from the default 3 minutes to 5 minutes. Flux's Kustomization API defaults `.spec.timeout` from `.spec.interval`, not a fixed 3 minutes, so the comment was changed to say it increases the health check timeout to 5 minutes.
- The command `kubectl get kustomization my-app -n flux-system -o jsonpath='{.spec.dependsOn}' | jq .` could pass non-JSON jsonpath output into `jq`. It was changed to `kubectl get kustomization my-app -n flux-system -o json | jq '.spec.dependsOn'`.

## Review Notes
The short Flux aliases used in the post, including `flux get ks`, `flux reconcile ks`, and `flux get source git`, are supported by the Flux CLI source even though the official command reference primarily documents the longer command names. Health check troubleshooting assumes the Kustomization has `.spec.healthChecks` configured or `.spec.wait: true`; otherwise Flux may mark an apply successful without waiting for every workload to become healthy.
