# Validation Summary: How to Set Up Cross-Namespace Routing with Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Gateway
- HTTPRoute
- ReferenceGrant
- Kubernetes Services and Secrets
- kubectl
- Istio Gateway API support
- istioctl diagnostics

## Sources Consulted
- Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Gateway API API overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Gateway API ReferenceGrant documentation: https://gateway-api.sigs.k8s.io/api-types/referencegrant/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The ReferenceGrant examples used `apiVersion: gateway.networking.k8s.io/v1beta1`. Gateway API v1.5 documents ReferenceGrant in `gateway.networking.k8s.io/v1`, so the examples were updated to use the current stable API version.
- The troubleshooting section implied that missing cross-namespace backend ReferenceGrants should be checked when the route `Accepted` condition is false. Gateway API tracks backend reference problems with the `ResolvedRefs` condition, so the section was updated to keep attachment checks under `Accepted` and backend ReferenceGrant checks under `ResolvedRefs`.

## Review Notes
- The Gateway, HTTPRoute, `allowedRoutes`, namespace selector, listener hostname, cross-namespace backend, and cross-namespace certificate reference examples match the Gateway API model.
- `kubectl` commands use valid `get`, `label`, `-A`, `-n`, YAML, JSONPath, and custom-columns forms.
- `istioctl analyze` and `istioctl proxy-config route` are valid diagnostic commands, but the exact generated gateway Deployment name assumes Istio's automated Gateway deployment naming convention of `<Gateway name>-<GatewayClass name>`.
