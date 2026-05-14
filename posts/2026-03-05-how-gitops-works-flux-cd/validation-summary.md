# Validation Summary: How GitOps Works with Flux CD Explained Simply

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- GitOps
- Kubernetes
- Kustomize
- Helm
- OCI registries
- GitHub bootstrap workflow
- Kubernetes custom resources

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux `bootstrap github` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux `get` CLI reference: https://fluxcd.io/flux/cmd/flux_get/
- Flux `events` CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux alerts documentation: https://fluxcd.io/flux/monitoring/alerts/
- Flux GitOps Toolkit components documentation: https://fluxcd.io/flux/components/
- OpenGitOps principles: https://opengitops.dev/

## Issues Found
- The first diagram said Flux reports status back to the Git repository. Flux reports status through Kubernetes custom resource conditions and Kubernetes events; commit status updates require additional notification-controller configuration. Updated the diagram label to say Flux reports Kubernetes status and events to the cluster.
- The observability section said Flux provides status conditions on every resource it manages. Flux custom resources expose status conditions, while managed Kubernetes resources have their own Kubernetes status. Updated the wording to refer specifically to Flux custom resources.
- The failure-handling section implied notification-controller always sends alerts and that the cluster always retains the previous working state. Flux emits Kubernetes events and notification-controller forwards alerts only when alerts/providers are configured; resources already applied remain in their last applied state when reconciliation fails before applying the new desired state. Updated the wording to reflect that behavior.

## Review Notes
The Flux `GitRepository` and `Kustomization` examples use current stable API versions and valid fields. The `flux bootstrap github`, `flux get all`, `flux get kustomizations`, and `flux events --watch` commands are valid in the current Flux CLI documentation. The `targetNamespace` example is valid, but in real clusters the target namespace must already exist or be included in the Kustomization source.
