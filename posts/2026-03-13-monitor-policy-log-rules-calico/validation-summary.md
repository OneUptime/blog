# Validation Summary: How to Monitor the Impact of Calico Policy Log Rules in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico, open source)
- Calico policy rule `action: Log` ("Policy Log Rules")
- Kubernetes NetworkPolicy / Calico `GlobalNetworkPolicy` and `NetworkPolicy` (`projectcalico.org/v3`)
- Felix (Calico's per-node policy enforcement daemon) and its Prometheus metrics
- FelixConfiguration CRD (`prometheusMetricsEnabled`)
- Prometheus Operator (`PrometheusRule` CRD, `monitoring.coreos.com/v1`)
- Grafana
- Mermaid diagram

## Sources Consulted
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico FelixConfiguration reference (`prometheusMetricsEnabled` field): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico NetworkPolicy/GlobalNetworkPolicy rule `action: Log` reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy and https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Cloud policy metrics reference (`calico_denied_packets`, `cnx_policy_rule_packets`): https://docs.tigera.io/calico-cloud/operations/monitor/metrics/policy-metrics
- Prometheus Operator `PrometheusRule` CRD reference: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found

1. **`felix_denied_packets_total` does not exist in open source Calico.** It appeared twice — as a PromQL example in Step 2 and as the `HighDenialRate` alert expression in Step 3. With open source Felix this series would never exist and the alert would never fire. Replaced the PromQL example with `rate(felix_iptables_save_errors[5m])` (a real Felix counter that indicates Felix is failing to push policy state into iptables on that node) and replaced the alert with a matching `FelixIptablesSaveErrors` alert, which is a meaningful proxy for "are policy rules — including Log rules — actually being programmed on this node?". Added a paragraph clarifying that per-policy denied-packets metrics (`calico_denied_packets`, `cnx_policy_rule_packets`) are only available in Calico Cloud / Calico Enterprise.

2. **`felix_active_network_policies` is not a real Felix metric.** The actual Felix gauge is `felix_active_local_policies` (number of policies active on the local node). Replaced it with the correct name.

3. **`felix_policy_evaluation_total` does not exist.** Open source Felix exposes no counter by this name. Replaced it with `felix_cluster_num_policies`, a real gauge that reports the cluster-wide policy count, which is the closest thing on the same dashboard.

## Review Notes
- The post conflates "Policy Log Rules" (the `action: Log` rule action in Calico policies) with general policy monitoring. The metrics shown after the fix are accurate Felix signals but they do not directly measure how many packets matched a `Log` action. The truest signal for "did my Log rule fire" is in `iptables -L` chain counters and in the syslog / kernel log lines that Felix's Log action produces — those are outside the scope of Prometheus on open source. Did not restructure the post per the review guidelines (only fix technical errors, no new sections).
- The `kubectl patch felixconfiguration default --type=merge -p '{"spec":{"prometheusMetricsEnabled":true}}'` command is correct. `prometheusMetricsEnabled` is a real field on `FelixConfiguration`, defaults to `false`, and a strategic-merge patch is the conventional way to flip it.
- The Step 3 `PrometheusRule` manifest uses the correct API version (`monitoring.coreos.com/v1`) and kind; the structure is valid for prometheus-operator.
- The mermaid diagram is syntactically valid. Calling the diamond `Calico Policy\nPolicy Logging` is awkward wording but not technically wrong; left as-is per the "no stylistic changes" rule.
- Title/intro repetition ("Calico Policy Log Rules in Calico", "monitor Policy Logging in Calico") and the "for monitor Policy Logging" grammar slip in Step 0 are stylistic and were left alone.
- The `Calico v3.26+` prerequisite is conservative-but-correct — the `action: Log` rule and FelixConfiguration `prometheusMetricsEnabled` field both long predate v3.26.
