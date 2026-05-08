# Validation Summary: How to Validate Cilium GAMMA Support

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Gateway API
- GAMMA
- HTTPRoute
- Hubble
- Envoy
- eBPF

## Sources Consulted
- Cilium GAMMA Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gamma/
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Service Mesh Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting_servicemesh/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium command reference for `cilium-dbg bpf config list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/

## Issues Found
- The post described GAMMA HTTPRoute rules as being actively enforced by eBPF programs. Cilium documentation describes GAMMA as intercepting L7 traffic and routing it through the per-node Envoy proxy, with the Cilium datapath redirecting traffic. Updated the wording to reflect the Cilium datapath plus Envoy model.
- The prerequisites listed Cilium 1.15+ for GAMMA. Cilium v1.15 documentation does not include the GAMMA support page, while v1.16 does. Updated the prerequisite to Cilium 1.16+.
- The feature validation command checked a non-existent `enable-gateway-api-gamma` ConfigMap key. Cilium Gateway API is enabled through `gatewayAPI.enabled`, surfaced in the ConfigMap as `enable-gateway-api`. Updated the command accordingly.
- The HTTPRoute status command read the first condition only, which is order-dependent and could report the wrong condition. Updated it to select `Accepted` and `ResolvedRefs` by condition type.
- The architecture diagram referenced `cilium-dbg policy get` and generic eBPF program loading for GAMMA validation. Updated it to use `cilium-dbg status` and show eBPF forwarding L7 traffic to Envoy.
- The Hubble command used service-to-service filters that were not aligned with the earlier one-off test pod workflow. Updated it to observe forwarded HTTP flows for a backend pod, matching official Hubble examples.
- The eBPF validation command used `cilium-dbg bpf config list | grep -i gamma`, which is not a valid way to confirm GAMMA route application. Updated the check to inspect Cilium status for kube-proxy replacement and proxy status.

## Review Notes
Cilium's current stable documentation states that Cilium supports GAMMA v1.0.0 for HTTPRoute and ReferenceGrant, supports producer routes, and does not support consumer HTTPRoutes. The post remains a validation checklist rather than a full setup guide, so those caveats were not expanded into new sections.
