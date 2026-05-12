# Validation Summary: How to Roll Out Calico GlobalNetworkPolicy Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico OSS, v3.26+)
- Kubernetes
- Calico GlobalNetworkPolicy (`projectcalico.org/v3`)
- Felix Prometheus metrics
- `calicoctl` / `kubectl`
- Mermaid (architecture diagram)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico component logs guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico log-action rules reference: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules

## Issues Found

1. **Fabricated Felix Prometheus metric name.**
   - The original Verification snippet ran `curl -s http://localhost:9091/metrics | grep felix_denied`.
   - Calico OSS Felix does not expose any metric named `felix_denied`, `felix_denied_packets`, or `felix_denied_packets_total`. Per-policy / per-rule denied-packet counters are a Calico Enterprise / Calico Cloud feature, not OSS. Real Felix metric prefixes include `felix_active_local_endpoints`, `felix_int_dataplane_*`, `felix_iptables_*`, `felix_calc_graph_*`, `felix_bpf_*`, etc.
   - Fixed by replacing the grep with a generic `^felix_` pattern, which actually returns Felix metrics from the standard scrape endpoint on port 9091.

2. **Incorrect Felix log location and content for policy denials.**
   - The original snippet did `tail -f /var/log/calico/felix.log | grep "DENY"`.
   - In Tigera-operator-managed installs (the modern default), Felix runs in the `calico-node` container under namespace `calico-system` and logs to stdout; `/var/log/calico/felix.log` is only present if `LogFilePath` is explicitly configured. More importantly, Felix does **not** emit per-packet `DENY` lines to its own log — a plain `Deny` action produces no per-packet log entry. Per-packet logging requires an explicit `Log` action rule, and those entries are produced by the iptables LOG target with prefix `calico-packet:` into the kernel log (syslog/journal), not into `felix.log`.
   - Fixed by replacing the `tail` with `kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node`, which is the canonical way to read Felix logs under the operator.

## Review Notes
- The YAML schema is correct: `apiVersion: projectcalico.org/v3`, `kind: GlobalNetworkPolicy`, `selector: all()`, `order: 100`, `ingress`/`egress` rules with `action: Allow`, `source.selector` / `destination.selector`, `protocol: UDP`, `destination.ports: [53]`, and `types: [Ingress, Egress]` are all valid per the GlobalNetworkPolicy reference.
- `calicoctl apply -f` and `calicoctl get globalnetworkpolicies -o wide` are correct calicoctl commands.
- The example policy is simple — combined with a separate default-deny it would form a useful pattern; on its own it is permissive only for matching sources, since GlobalNetworkPolicy with `types: [Ingress, Egress]` but no matching rule defaults to drop for the selected workloads.
- The mermaid diagram uses `\n` inside a node label (`B{GlobalNetworkPolicy\nPolicy}`). Some Mermaid renderers prefer `<br/>` for line breaks, but the existing form is widely tolerated and not a technical error — left as-is in keeping with the author's style.
- The post targets Calico v3.26+; Calico is now at v3.32 and the operator-managed model is the recommended install path, but everything in the post remains compatible with current versions.
