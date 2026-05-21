# Validation Summary: How to Configure Multiple Match Conditions in VirtualService

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Istio VirtualService
- Istio HTTPMatchRequest matching
- Kubernetes custom resources
- istioctl
- kubectl
- HTTP request headers, methods, paths, and query parameters

## Sources Consulted
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110

## Issues Found
- Updated VirtualService examples from `networking.istio.io/v1beta1` to `networking.istio.io/v1`, matching the stable API version promoted in Istio 1.22 and used by current official Istio documentation.
- Clarified that `sourceLabels` is not a normal runtime request match. Istio documents it as a selector that filters which source workloads receive the rule in sidecar configuration, so the post now calls out that caveat and notes the `mesh` gateway requirement when top-level `gateways` are configured.
- Changed the port matching description from "incoming port" to "destination port being addressed", matching the Istio `HTTPMatchRequest.port` field description.
- Changed `istioctl proxy-config routes deploy/order-service -o json` to `istioctl proxy-config routes deployment/order-service -o json`, matching the resource form shown in the official `istioctl proxy-config routes` examples.

## Review Notes
The core AND/OR explanation is correct: Istio documents AND semantics within a single `HTTPMatchRequest` and OR semantics across the `match` list for an HTTP route. Header match keys in the examples are lowercase as required by Istio, and exact/prefix string matching is correctly treated as case-sensitive unless `ignoreUriCase` is used for URI exact/prefix matches.
