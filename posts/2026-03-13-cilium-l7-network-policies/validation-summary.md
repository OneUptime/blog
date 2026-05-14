# Validation Summary: Cilium L7 Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes NetworkPolicy
- CiliumNetworkPolicy
- Layer 7 policy enforcement
- Envoy
- Hubble
- HTTP
- gRPC
- Kafka policy support
- eBPF

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Envoy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium gRPC security example: https://docs.cilium.io/en/latest/security/grpc/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium policy API reference for `PortRuleHTTP` and `HeaderMatch`: https://pkg.go.dev/github.com/cilium/cilium@v1.19.3/pkg/policy/api

## Issues Found
- The introduction said Cilium can parse gRPC service and method names and decode Kafka topic access without caveats. Updated this to describe gRPC policy matching as HTTP POST path matching and to note that Kafka policy support is deprecated in current Cilium releases.
- The prerequisites omitted Hubble CLI/API access even though the guide uses `hubble observe`. Added Hubble as a prerequisite and removed the stale `v1.12+` version wording in favor of requiring Cilium with L7 proxy support enabled.
- The header policy used `headers: ["X-Internal-Token: .*"]`, which implies regex value matching. Cilium's `headers` field requires listed headers to be present; advanced value matching belongs under `headerMatches`. Changed the example to require presence of `X-Internal-Token`.
- Step 5 used the historical `policy.cilium.io/proxy-visibility` annotation. Current Cilium documentation recommends enabling L7 visibility with Cilium L7 policies instead. Replaced the annotation with a temporary `CiliumNetworkPolicy` that uses `http: [{}]` for HTTP visibility on the selected port.
- The conclusion and diagram described enforcement as only eBPF hooks redirecting traffic through Envoy. Current Cilium documentation describes L7 traffic as being proxied through a node-local Envoy instance, so the wording was adjusted to "Cilium proxy redirection" and "node-local Envoy proxy."

## Review Notes
- The L7 visibility example using `http: [{}]` is appropriate for debugging but can broaden allowed HTTP traffic for the selected source, destination, and port while it is applied. It should be treated as temporary in production environments.
- The `hubble observe --type l7`, `--namespace`, `--verdict DROPPED`, and `--pod namespace/name` usage is consistent with documented Hubble filtering patterns.
