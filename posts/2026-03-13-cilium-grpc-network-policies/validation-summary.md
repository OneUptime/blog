# Validation Summary: gRPC Policies with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes NetworkPolicy
- CiliumNetworkPolicy
- gRPC
- HTTP/2
- Hubble
- grpcurl
- eBPF

## Sources Consulted
- Cilium documentation: Securing gRPC - https://docs.cilium.io/en/stable/security/grpc/
- Cilium documentation: Layer 7 Policies - https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium documentation: Deny Policies - https://docs.cilium.io/en/stable/security/policy/deny/
- Cilium documentation: Layer 7 Protocol Visibility - https://docs.cilium.io/en/stable/observability/visibility/
- Cilium documentation: Inspecting Network Flows with the CLI - https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium/Hubble flow API documentation - https://docs.cilium.io/en/stable/_api/v1/flow/README.html
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- grpcurl README - https://github.com/fullstorydev/grpcurl
- gRPC core documentation: HTTP/2 protocol mapping - https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md

## Issues Found
- The post said to use a Cilium deny policy to allow all methods except dangerous ones. Cilium deny policies do not support L7 URL/path denial, so this was technically incorrect. I changed the section to recommend explicitly allowing safe methods.
- The example path regex used a negative lookahead: `/com.example.UserService/(?!Admin|Delete|Purge).*`. Cilium HTTP path rules use extended POSIX regular expressions, which do not support lookahead. I replaced it with an allow-list regex for safe methods.
- The Hubble example used `--protocol grpc`. Hubble L7 visibility for these policies observes the traffic as HTTP/HTTP2, and official examples use `--protocol http`. I changed the command to filter HTTP protocol flows and the gRPC path with `--http-path`.
- The prerequisite said "Envoy enabled." I changed it to "L7 proxy support enabled" to match Cilium's documented requirement for L7 policy visibility/enforcement.
- The denied-call example and architecture diagram implied an HTTP/2 403 error. Cilium's gRPC policy documentation shows denied gRPC calls surfacing as gRPC status code 7 `PERMISSION_DENIED`, so I updated the wording and diagram.

## Review Notes
The remaining CiliumNetworkPolicy examples match the documented Cilium L7 HTTP policy shape for gRPC services, where each gRPC method maps to an HTTP POST path such as `/package.Service/Method`. The grpcurl invocation shape is valid when server reflection is enabled or descriptors are otherwise available.
