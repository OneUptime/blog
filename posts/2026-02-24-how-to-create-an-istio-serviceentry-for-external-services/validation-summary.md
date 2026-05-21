# Validation Summary: How to Create an Istio ServiceEntry for External Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio outbound traffic policy
- Istio traffic management
- Kubernetes custom resources
- kubectl
- istioctl
- Envoy proxy configuration

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio accessing external services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec

## Issues Found
- The post said calls in `REGISTRY_ONLY` mode "fail silently" and specifically show connection refused errors. Istio documents that `REGISTRY_ONLY` blocks unknown hosts, but the exact client-facing error depends on protocol and request path. Updated the wording to say the calls fail because Istio blocks traffic to hosts not in the service registry, with generic connection errors.
- The verification command executed `curl` from the `istio-proxy` container. That container is not the right place to assume application test tools are available, and Kubernetes `kubectl exec -c` should target the container where the command exists. Updated the command to execute from an application container placeholder.
- The route inspection command was presented after an HTTPS example. Istio sidecars treat HTTPS as TLS-encrypted traffic and do not expose it as HTTP routes in the same way. Updated the note to say route inspection applies to HTTP services and changed the example route name from `443` to `80`.
- The namespace guidance said ServiceEntries are namespace-scoped by default in a way that implied other namespaces cannot see them. Istio documents that `exportTo` controls visibility and services are exported to all namespaces by default. Updated the wording to explain the default export behavior and the case where visibility is restricted.

## Review Notes
The ServiceEntry manifests use the current `networking.istio.io/v1` API and valid fields. The post uses `protocol: HTTPS` for external TLS endpoints, which is valid; Istio's own ServiceEntry examples often use `TLS` for SNI-based routing, and Istio protocol-selection documentation states that sidecars treat `https` similarly to `tls` because they do not decrypt TLS traffic.
