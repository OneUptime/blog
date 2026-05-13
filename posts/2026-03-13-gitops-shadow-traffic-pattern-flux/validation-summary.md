# Validation Summary: How to Implement GitOps Shadow Traffic Pattern with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomizations
- Kubernetes Deployments and Services
- Istio VirtualService traffic mirroring
- Istio DestinationRule traffic policies
- kubectl logging and metrics commands
- Kiali / istioctl dashboard access

## Sources Consulted
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction said the shadow version receives identical requests. Istio mirrored traffic is best-effort, fire-and-forget, and mirrored requests have their Host/Authority header appended with `-shadow`. Reworded the introduction and added this caveat after the `VirtualService` example.
- The promotion command comment said to update the `VirtualService` to route to v2.5.0, but the example service routes by selector to the stable Deployment and the command updates the stable Deployment image. Reworded the comment to match the manifest design.

## Review Notes
The Kubernetes `apps/v1` Deployment examples, Service selectors and ports, Istio `VirtualService` `mirror` / `mirrorPercentage` fields, Istio `DestinationRule` fields, Flux `Kustomization` v1 fields, `kubectl logs` flags, and `istioctl dashboard kiali` command are current and valid. For real ingress-gateway traffic, a complete production setup would also need the relevant Istio Gateway/host configuration; the post's `VirtualService` example is valid for traffic addressed to the in-mesh `my-app` service.
