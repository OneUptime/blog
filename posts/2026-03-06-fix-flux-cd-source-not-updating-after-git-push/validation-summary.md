# Validation Summary: How to Fix Flux CD Source Not Updating After Git Push

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux notification-controller
- Flux kustomize-controller
- GitRepository custom resources
- Receiver custom resources
- Kubernetes Secrets and Ingress
- Flux CLI
- kubectl

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux `reconcile source git` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux `reconcile kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The command for checking the last reconciliation time used `.status.conditions[0].lastTransitionTime`. Kubernetes condition ordering is not a reliable way to identify the most recent source update, and condition transition time is not the same as artifact update time. Changed it to `.status.artifact.lastUpdateTime`, which is the documented timestamp for the latest GitRepository artifact update.
- The Ingress example routed directly to a service named `notification-controller` on port `80`. Flux's webhook receiver documentation exposes webhooks through the `webhook-receiver` service on port `80`. Changed the backend service name to `webhook-receiver`.

## Review Notes
The local environment did not have the `flux` CLI installed, so CLI syntax was verified against the official Flux CLI documentation instead of local `--help` output. The remaining GitRepository, Receiver, Secret, Kustomization status, and reconciliation examples match the current official Flux documentation.
