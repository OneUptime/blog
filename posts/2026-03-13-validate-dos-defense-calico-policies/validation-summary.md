# Validation Summary: How to Validate Calico DoS Defense Policies Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source and Calico Enterprise
- Kubernetes
- Calico GlobalNetworkPolicy
- calicoctl
- kubectl
- Felix and Calico policy metrics
- Calico eBPF dataplane

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- calicoctl validate command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico eBPF installation guide: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Enterprise recommended Prometheus metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Calico Enterprise policy metrics reference: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics

## Issues Found
- The sample policy was named and commented as a rate-limit policy, but Calico GlobalNetworkPolicy provides allow/deny policy enforcement and does not define request or connection rate limits. Renamed the policy and replaced the rate-limit comment with guidance to use an ingress controller, service mesh, or external DDoS protection for rate limiting.
- The HTTP/S allow rule did not specify `protocol: TCP`, even though the rule matches destination ports. Added `protocol: TCP` to align with Calico policy examples and avoid ambiguous port matching.
- The second ingress rule used `action: Allow` with no match criteria, allowing all remaining ingress traffic to the selected workloads. Changed it to `action: Deny` so the example enforces the intended boundary after allowing ports 80 and 443.
- The implementation applied the policy without first validating it, even though the post is about validation. Added `calicoctl validate -f dos-defense.yaml` before `calicoctl apply -f dos-defense.yaml`.
- The metrics examples used undocumented `felix_denied` and `felix_denied_packets_total` names. Replaced them with the documented Calico Enterprise policy metric `calico_denied_packets` and the documented default policy metrics port `9081`.
- The eBPF section claimed eBPF enables rate limiting support and used an incomplete operator resource name. Changed the section to describe enabling the eBPF dataplane and updated the command to `kubectl patch installation.operator.tigera.io default --type merge ...` with the documented `hostPorts` setting.

## Review Notes
- The policy examples are valid as defensive allow/deny examples, but Calico network policy alone is not a complete DoS mitigation strategy. Production DoS protection should also include upstream DDoS controls and application-layer or ingress-layer rate limiting.
- Calico Enterprise policy metrics are product-specific and require the policy metrics endpoint to be enabled and scraped. Open source Felix metrics on port 9091 do not provide the same denied-packet policy metrics.
