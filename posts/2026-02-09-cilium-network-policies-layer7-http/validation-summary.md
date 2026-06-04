# Validation Summary: How to Configure Cilium Network Policies with Layer 7 HTTP Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- CiliumNetworkPolicy
- Cilium L7 HTTP policy
- Envoy
- Hubble
- Helm

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Helm Reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Policy Audit Mode documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg/
- Cilium cilium-dbg monitor command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_monitor/
- Cilium cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html

## Issues Found
- The post incorrectly stated that Cilium inspects HTTP traffic entirely in the kernel without userspace proxying. Updated the explanation to state that eBPF redirects matching L7 traffic to node-local Envoy for enforcement.
- The Helm value `l7Proxy.enabled=true` was incorrect. Updated it to the documented `l7Proxy=true` value.
- The `hashicorp/http-echo` example exposed port 8080 but did not configure the container to listen on that port. Added `-listen=:8080`.
- The audit-mode example used an unsupported `policy.cilium.io/audit-mode` annotation on a `CiliumNetworkPolicy`. Replaced it with the documented `policyAuditMode=true` Helm setting and clarified that audit mode is configured at agent or endpoint scope.
- The Hubble query used `--type l7`. Updated it to the documented HTTP protocol filter form, `--protocol http`.
- The rate limiting example used an unsupported `rateLimit` field inside Cilium HTTP rules. Replaced it with a valid method/path policy and noted that request rate limiting should be implemented outside CiliumNetworkPolicy.
- The egress HTTP example attempted L7 HTTP filtering on HTTPS port 443. Changed the example to HTTP on port 80 because Cilium HTTP policy cannot inspect encrypted HTTPS payloads without TLS termination.
- The kube-dns selector used `k8s-app: kube-dns` in a Cilium endpoint selector. Updated it to the documented Cilium label key `k8s:k8s-app: kube-dns`.
- The debugging commands mixed older `cilium` in-pod commands with current documented `cilium-dbg` commands. Updated endpoint, monitor, and metrics examples to use `cilium-dbg`.
- The performance section gave an unsourced fixed latency range. Replaced it with a qualitative statement that L7 policy adds latency from proxying through Envoy.

## Review Notes
The post is technically relevant and usable after correction. Future improvements could add a note that Cilium HTTP L7 rules match plaintext HTTP traffic, so HTTPS method/path/header policy requires TLS termination before the L7 policy enforcement point.
