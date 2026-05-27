# Validation Summary: How to Check MetalLB Events on a Service with kubectl describe

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services and Events
- kubectl
- MetalLB controller and speaker
- MetalLB IPAddressPool resources
- jq

## Sources Consulted
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kube-apiserver reference for `--event-ttl`: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- MetalLB controller source for event reasons/messages: https://raw.githubusercontent.com/metallb/metallb/main/controller/service.go
- MetalLB allocator source for allocation error strings: https://raw.githubusercontent.com/metallb/metallb/main/internal/allocator/allocator.go

## Issues Found
- The event flow diagram described an "Error Events" category and a `ConfigurationError` reason. Kubernetes event types are Normal and Warning, and current MetalLB service allocation code emits warning events such as `AllocationFailed` and `LoadBalancerFailed` for these cases. Updated the diagram to avoid implying a separate Error event type.
- The filtering section said "warning or error events." Kubernetes events are normally filtered by `type=Warning` or `type=Normal`; there is no standard `Error` event type. Renamed the section and text to "Filtering Warning Events."
- The nonexistent-pool example used `no matching IPAddressPool`. Current MetalLB allocator errors for a requested pool that does not exist use `unknown pool "name"`. Updated the examples and fix text accordingly.
- The "IP Already In Use" example used a generic `"192.168.1.100" is already in use` message. Current MetalLB allocator messages are more specific, for example `port TCP/80 is already in use on "192.168.1.100"` or sharing-key conflicts. Updated the example and fix text.

## Review Notes
The `kubectl get events -A --field-selector source=...` examples are valid because Kubernetes Events support the `source` field selector, though newer event data may also expose `reportingComponent`. The post could later mention `kubectl events --for service/my-service --watch` as an alternative, but the existing `kubectl describe` and `kubectl get events` commands are technically valid.
