# Validation Summary: How to Train Your Team on Flux CD GitOps Workflows

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- GitOps
- Kubernetes
- Kustomize
- Helm
- External Secrets Operator
- Git

## Sources Consulted
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Flux `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux `flux logs` documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Flux `flux stats` documentation: https://fluxcd.io/flux/cmd/flux_stats/
- Flux CLI v2.8.6 `--help` output from the official release binary
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Image Automation documentation: https://fluxcd.io/flux/components/image/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- Updated the ExternalSecret example from `apiVersion: external-secrets.io/v1beta1` to `external-secrets.io/v1` because the current External Secrets Operator documentation shows `ExternalSecret` using the GA `v1` API.
- Changed `flux get kustomization my-app` to `flux get kustomizations my-app` because the current Flux CLI documents the `get` subcommand as `flux get kustomizations`.
- Changed `flux get helmrelease my-chart -n my-namespace` to `flux get helmreleases my-chart -n my-namespace` because the current Flux CLI documents the `get` subcommand as `flux get helmreleases`.

## Review Notes
The local environment did not have `flux` or `kubectl` installed initially, so CLI verification was performed against official command reference pages and the official Flux v2.8.6 release binary. `flux logs` and `flux stats` are documented as preview commands, but their usage in the post matches the current Flux documentation.
