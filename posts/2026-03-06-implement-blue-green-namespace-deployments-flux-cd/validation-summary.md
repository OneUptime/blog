# Validation Summary: How to Implement Blue-Green Namespace Deployments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization and notification-controller Alert resources
- Kubernetes Deployments, Services, ExternalName Services, Ingress, Namespaces, labels, and probes
- Kustomize bases, overlays, images, and patches
- Istio VirtualService traffic routing
- GitOps deployment and rollback workflow

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Kustomize documentation: https://kustomize.io/

## Issues Found
- ExternalName Service snippets omitted a `ports` entry while the Ingress backend referenced port 80. Added `ports: - port: 80` to each `my-app-active` Service example so the backend service port exists.
- Flux Kustomization examples used `wait: true` together with explicit `healthChecks`. Flux documentation states that `healthChecks` are ignored when `wait` is true, so the redundant health checks were removed.
- The deployment workflow changed into the overlay directory and then used repository-root `git add` paths. Removed the `cd` command and directed the reader to edit the target file by path.
- Flux CLI examples used `flux get kustomization <name> --watch`, but the documented command is `flux get kustomizations --watch`. Updated the commands and comments accordingly.
- Namespace active labels were updated imperatively with `kubectl label`, which Flux would revert because the namespaces are managed from Git. Updated the workflow and rollback to commit label changes in Git along with the router change.
- Istio VirtualService examples used `networking.istio.io/v1beta1`; current Istio documentation uses `networking.istio.io/v1`. Updated both examples to the current API version.
- The scale-down example showed a partial Deployment manifest as if it were a standalone resource. Replaced it with an inline Kustomize patch in the overlay `kustomization.yaml`.
- Flux Alert used `notification.toolkit.fluxcd.io/v1` and `.spec.summary`. Current Flux Alert docs show `v1beta3`, and `.spec.summary` is deprecated in favor of event metadata. Updated the API version and moved the summary to `.spec.eventMetadata.summary`.

## Review Notes
- The Ingress example is controller-specific because it uses an ingress-nginx annotation. Kubernetes Ingress remains stable, but the upstream ingress-nginx project documentation notes best-effort maintenance through March 2026 and no further releases after that date.
