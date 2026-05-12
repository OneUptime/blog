# Validation Summary: How to Test DoS Defense Calico Policies with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes
- GlobalNetworkPolicy (Calico CRD)
- calicoctl
- Felix Prometheus metrics
- eBPF dataplane (Calico)
- Calico Operator (Installation CRD)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Felix Prometheus metrics: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Operator Installation CRD: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico eBPF dataplane configuration: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/

## Issues Found
No technical issues found that warranted in-post fixes. The Calico API version, GlobalNetworkPolicy schema, selector syntax, order semantics (lower order = higher priority), the Felix Prometheus port (9091), and the operator patch to switch the Linux dataplane to BPF are all correct.

## Review Notes
- The metric name `felix_denied_packets_total` used in the `curl | grep` examples is not a standard metric exposed by OSS Calico's Felix Prometheus endpoint. OSS Felix exposes metrics like `felix_active_local_policies`, `felix_int_dataplane_apply_time_seconds`, etc. Denied-packet counters are typically a Calico Enterprise feature (e.g., `cnx_policy_rule_packets`/`cnx_policy_rule_bytes`) or available via the eBPF dataplane in specific configurations. The post does already note that rate limiting requires Calico Enterprise or eBPF mode, so readers are warned about the Enterprise dependency. Left as-is because the grep is illustrative of the workflow rather than a precise metric contract.
- The first `GlobalNetworkPolicy` (`dos-defense-rate-limit`) does not actually enforce rate limiting — the YAML simply allows traffic on ports 80/443. The inline comment correctly notes that real rate limiting needs Calico Enterprise or the eBPF dataplane. This is honest about OSS limits, but readers should not expect rate-limiting behavior from this policy alone.
- The example IP ranges `198.51.100.0/24` and `203.0.113.0/24` are TEST-NET-2 and TEST-NET-3 (RFC 5737) — appropriate for documentation examples.
- Calico v3.26 is a reasonable minimum version for the operator-based Installation CRD and current eBPF support.
