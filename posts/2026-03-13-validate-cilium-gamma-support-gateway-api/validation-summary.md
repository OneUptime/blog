# Validation Summary: How to Validate Cilium GAMMA Support in the Cilium Gateway API

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
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/

## Issues Found
- The post described a non-documented `enable-gateway-api-gamma` Cilium config key. Current Cilium documentation enables Gateway API with `gatewayAPI.enabled=true`, reflected in Cilium config as `enable-gateway-api`, and requires kube-proxy replacement plus the L7 proxy for GAMMA. I replaced the command with a `cilium config view` check for `enable-gateway-api`, `kube-proxy-replacement`, and `enable-l7-proxy`.
- The post stated that GAMMA routes are compiled into eBPF programs. Cilium documentation describes eBPF intercepting or redirecting traffic to the per-node Envoy proxy for L7 handling, with the operator and agent translating Gateway API resources into Envoy configuration. I updated the description, introduction, and architecture diagram to refer to the Cilium L7 proxy and Envoy rather than per-route eBPF programs.
- The prerequisites referred to experimental Gateway API CRDs. HTTPRoute is a standard Gateway API resource, while Cilium's GAMMA support itself is experimental in the Gateway API mesh profile context. I changed the prerequisite to "Gateway API CRDs installed."
- The CRD validation only mentioned HTTPRoute. Cilium's GAMMA support lists HTTPRoute and ReferenceGrant, so I added `referencegrants.gateway.networking.k8s.io` to the expected CRDs.
- The HTTPRoute jq command could read route metadata from the wrong jq context and only checked the first status parent. I updated it to bind the route as `$route`, safely select Service parentRefs, and read route metadata from `$route`.

## Review Notes
- The Hubble command is a reasonable validation step for observing HTTP traffic, but it depends on Hubble being enabled and reachable from the CLI environment.
- A 20-request sample is enough for a quick smoke test, but weighted routing validation can be noisy. CI pipelines should use a larger request count or tolerance band for statistical checks.
