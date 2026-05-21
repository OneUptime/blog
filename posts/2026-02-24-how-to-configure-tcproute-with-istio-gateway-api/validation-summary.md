# Validation Summary: How to Configure TCPRoute with Istio Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Gateway API
- TCPRoute
- TLSRoute
- HTTPRoute
- ReferenceGrant
- Kubernetes Services
- Istio DestinationRule
- istioctl
- kubectl

## Sources Consulted
- Kubernetes Gateway API getting started and CRD installation docs: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/
- Kubernetes Gateway API v1.5 API reference: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Kubernetes Gateway API ReferenceGrant guide: https://gateway-api.sigs.k8s.io/api-types/referencegrant/
- Istio Kubernetes Gateway API docs: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio TCP traffic shifting docs with Gateway API TCPRoute examples: https://istio.io/latest/docs/tasks/traffic-management/tcp-traffic-shifting/
- Istio egress Gateway API docs covering alpha Gateway API resources: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found
- The Gateway API CRD install command used the older `v1.2.0` experimental bundle. Updated it to `v1.5.1` and added `--server-side`, matching current official Gateway API/Istio installation guidance.
- The prerequisites did not mention that Istio must be configured to read alpha Gateway API resources for TCPRoute. Added the `PILOT_ENABLE_ALPHA_GATEWAY_API=true` install setting from Istio's official docs.
- The introduction said TCPRoute replaces Istio VirtualService TCP routing. Adjusted this to say it is a standardized alternative, because Istio still supports VirtualService TCP routing.
- The cross-namespace ReferenceGrant example granted access from the Gateway namespace instead of the TCPRoute namespace, and the route example did not actually reference a backend in another namespace. Updated the TCPRoute to run in an `app` namespace, reference a Service in `database`, and updated the ReferenceGrant to permit `TCPRoute` references from `app`.
- The ReferenceGrant example used `gateway.networking.k8s.io/v1beta1`. Updated it to `gateway.networking.k8s.io/v1`, which is current in Gateway API v1.5.

## Review Notes
TCPRoute remains part of the Gateway API experimental channel, so future Gateway API releases may still introduce breaking changes to TCPRoute itself. The remaining examples are syntactically consistent with the current Gateway API TCPRoute schema and Istio's documented Gateway API TCP routing examples.
