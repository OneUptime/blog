# Validation Summary: How to Monitor the Impact of Calico Tiered Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico, open source)
- Calico Tiered Policies (`Tier`, `GlobalNetworkPolicy`, `NetworkPolicy` under `projectcalico.org/v3`)
- Kubernetes
- Felix (Calico's per-node policy enforcement daemon)
- Prometheus (Felix metrics endpoint)
- Prometheus Operator (`PrometheusRule` CRD, `monitoring.coreos.com/v1`)
- Grafana

## Sources Consulted
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Tiered Policy documentation (open source): https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Cloud Policy Metrics (`calico_denied_packets`, `cnx_policy_rule_packets`): https://docs.tigera.io/calico-cloud/operations/monitor/metrics/policy-metrics
- Prometheus Operator `PrometheusRule` CRD reference

## Issues Found

1. **Wrong minimum Calico version.** The post claimed Calico v3.26+ was sufficient for tiered policies. The open source `Tier` resource was only added to Project Calico in v3.29 (prior to that, tiers were a Calico Enterprise / Cloud-only feature). Updated the prerequisite to `Calico v3.29+` with a brief note.

2. **`felix_denied_packets_total` does not exist in open source Calico.** No Felix metric in OSS exposes per-policy or aggregate denied-packet counts. The closest equivalents (`calico_denied_packets`, `cnx_policy_rule_packets`) are Calico Cloud / Enterprise metrics. Removed the metric and the `HighDenialRate` alert that depended on it, and added a note pointing readers on Enterprise/Cloud to the right metrics.

3. **`felix_active_network_policies` does not exist.** The correct metric names are `felix_cluster_num_policies` (cluster-wide gauge) and `felix_active_local_policies` (per-host gauge). Replaced with both so readers get cluster-wide visibility plus per-host detail.

4. **`felix_policy_evaluation_total` does not exist.** Felix exposes no counter for policy-evaluation rate in open source. Removed the bogus metric and replaced it with `felix_cluster_num_tiers` (directly relevant to a tiered-policy post) and `felix_iptables_rules` (a working proxy for total programmed rules in the iptables dataplane).

5. **`HighDenialRate` PrometheusRule was unfirable.** Because its `expr` referenced the non-existent `felix_denied_packets_total`, the alert would never evaluate to a non-empty series. Replaced the rule group with three alerts that use real Felix metrics and are meaningful for a tier-rollout monitoring use case: `PolicyCountDropped` (`delta(felix_cluster_num_policies[10m]) < -5`), `TierCountDropped` (`delta(felix_cluster_num_tiers[10m]) < 0`), and `FelixIptablesSaveErrors` (`rate(felix_iptables_save_errors[5m]) > 0`).

6. **Step 4 (Grafana Dashboard) referenced the same bogus metrics.** Rewrote the paragraph to describe panels that can actually be built from the corrected metric list, with a note about adding `calico_denied_packets` / `cnx_policy_rule_packets` if the reader is on Cloud/Enterprise.

## Review Notes
- `kubectl patch felixconfiguration default --type=merge -p '{"spec":{"prometheusMetricsEnabled":true}}'` is correct: the field name is `prometheusMetricsEnabled` (camelCase in the CR spec) and the default state is disabled. The default scrape port is `9091`.
- The post never mentions a `ServiceMonitor` / `PodMonitor` or how Prometheus actually scrapes Felix. That is out of scope to add as a fix, but a follow-up edit could improve completeness — without it, simply enabling the metrics endpoint won't get the metrics into Prometheus.
- Grammatical artifacts remain in the prose ("techniques for monitor Tiered Policies", "Tiered Policies policies", "Monitor Tiered Policies policies in Calico requires"). These are stylistic and were intentionally left alone per the review guidelines (only technical errors fixed).
- The architecture mermaid diagram is generic and not technically wrong, but does not actually depict the tier-ordering semantics that are the whole point of Tiered Policies (pass / deny / next-tier evaluation). A future revision could replace it with a tier-traversal diagram.
- `delta()` over a 10-minute window is appropriate for a Gauge like `felix_cluster_num_policies`; `rate()` would be wrong here because it's not a counter.
