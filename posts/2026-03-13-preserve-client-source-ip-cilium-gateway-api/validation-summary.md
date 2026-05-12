# Validation Summary: How to Preserve Client Source IP with the Cilium Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium (Gateway API implementation)
- Kubernetes Gateway API (`gateway.networking.k8s.io/v1`)
- Kubernetes Services (`externalTrafficPolicy`)
- Envoy proxy (X-Forwarded-For / X-Envoy-External-Address)
- kubectl

## Sources Consulted
- [Cilium Gateway API documentation](https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/)
- [Cilium HTTP Header Modifier examples](https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/header/)
- [Cilium operator gateway-api translator source](https://github.com/cilium/cilium/blob/main/operator/pkg/model/translation/gateway-api/translator.go) — confirms LoadBalancer Service labels
- [Kubernetes Gateway API HTTP header modifier guide](https://gateway-api.sigs.k8s.io/guides/http-header-modifier/)
- [Kubernetes Gateway API HTTPRoute reference](https://gateway-api.sigs.k8s.io/api-types/httproute/)
- Kubernetes Service `externalTrafficPolicy` documentation

## Issues Found

1. **Incorrect label selector for the Cilium-managed LoadBalancer Service.**
   The post used `cilium.io/gateway-name=cilium-gateway` in a `kubectl get svc -l ...` command. Cilium does not set that label. According to the Cilium operator source, the LoadBalancer Service auto-created for a Gateway is labeled with `gateway.networking.k8s.io/gateway-name=<gateway-name>` (preferred) and the older, now-deprecated `io.cilium.gateway/owning-gateway=<gateway-name>`. The command as written would have matched zero services. Updated the selector to `gateway.networking.k8s.io/gateway-name=cilium-gateway`.

2. **Invalid variable substitution syntax in `RequestHeaderModifier`.**
   The Method 2 example added an `X-Real-IP` header with the value `"%{client_ip}s"`. Gateway API's `RequestHeaderModifier` filter treats `value` as a literal HTTP header value — there is no variable substitution defined by the spec, and Cilium's documentation likewise only documents static values. The literal string `%{client_ip}s` would have been sent verbatim, not the client IP. Replaced this section to describe Cilium's actual behavior: Cilium's Envoy proxy automatically appends the visible client address to `X-Forwarded-For` and exposes the trusted client address in `X-Envoy-External-Address` with no filter required, and provided a complete, valid `HTTPRoute` manifest as the example.

## Review Notes

- Per Cilium's docs, configuring `externalTrafficPolicy: Local` is **not strictly required** for source-IP visibility to backends when using Cilium's Gateway API — both `Cluster` and `Local` keep the source IP intact at the Envoy layer because Cilium intercepts traffic with eBPF/TPROXY and forwards it to Envoy preserving the source address. The post still describes a valid trade-off (true L3 source IP vs. uneven load distribution), so the section was left in place, but readers should know that for HTTP workloads the `X-Forwarded-For` approach is sufficient and is the default behaviour.
- The `service.beta.kubernetes.io/aws-load-balancer-type` annotation placed on the `Gateway` only propagates to the underlying Service if Cilium is configured to propagate annotations (e.g., via the `gatewayAPI.gatewayClass.config.allowedAnnotations` Helm value or service-annotation propagation flags). Left as-is because it is a reasonable hint for AWS users, but worth flagging that this is not automatic in all installations.
- Header names `X-Forwarded-For` / `X-Real-IP` are not on the IANA registry and applications must explicitly trust them; the post already calls this out in the trade-offs table.
