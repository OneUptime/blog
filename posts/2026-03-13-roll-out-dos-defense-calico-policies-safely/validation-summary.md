# Validation Summary: How to Roll Out DoS Defense Calico Policies Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico OSS, v3.26+)
- Kubernetes
- Calico GlobalNetworkPolicy (`projectcalico.org/v3`)
- Felix Prometheus metrics
- Calico eBPF dataplane
- `calicoctl` / `kubectl`

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Felix Prometheus metrics: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Enabling the eBPF dataplane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Defend against DoS attacks (Calico): https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack

## Issues Found
- **Fabricated Felix metric name.** The original Implementation snippet grepped for `felix_denied` and `felix_denied_packets_total`. Felix does **not** expose a metric called `felix_denied_packets_total`; the official Felix Prometheus reference has no denied-packets counter (denied-traffic visibility in OSS comes from iptables/BPF logs, not a dedicated Felix counter). I replaced the grep patterns with a generic `^felix_` scrape and a real metric, `felix_int_dataplane_apply_time_seconds`, so the example commands actually return data.

## Review Notes
- The `projectcalico.org/v3` apiVersion, `GlobalNetworkPolicy` kind, and the `order` / `selector` / `ingress` / `types` fields used in the YAML are all valid. The ordering (block bad actors at `order: 10` before the rate-limit rule at `order: 50`) is correct since lower order is evaluated first.
- The IP ranges `198.51.100.0/24` (TEST-NET-2) and `203.0.113.0/24` (TEST-NET-3) are RFC 5737 documentation ranges, which is appropriate for an example.
- The eBPF enablement command (`kubectl patch installation default ... linuxDataplane: BPF`) is correct against the operator-managed Installation CR.
- The first policy's second `- action: Allow` rule (with no match criteria) is permissive — it allows any remaining ingress to `web-frontend`. That is syntactically valid and acts as the policy's default-allow tail, but readers operating in a default-deny posture should be aware it will allow all other traffic that matches the selector. Not changed since it is not technically wrong.
- The note that "Rate limiting requires Calico Enterprise or eBPF mode" is accurate for Calico OSS at the v3.26+ baseline this post targets. Calico v3.30 introduced an Ingress Gateway with native rate limiting; readers on newer versions have additional options.
- The Calico-recommended DoS pattern (`doNotTrack: true`, XDP, `preDNAT`/`applyOnForward` for host endpoints) is not covered here; the post sticks to conventional GlobalNetworkPolicy. That is a future-improvement opportunity rather than an error.
