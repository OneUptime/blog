# Validation Summary: How to Monitor the Impact of ICMP and Ping Rules in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico FelixConfiguration
- Calico GlobalNetworkPolicy and NetworkPolicy
- ICMP and ICMPv6 policy matching
- Prometheus and PrometheusRule
- Grafana

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Use ICMP/ping rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/icmp-ping
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy

## Issues Found
- The post used `felix_denied_packets_total`, which is not a documented Calico Open Source Felix metric. I replaced the denied packet query and alert with `felix_label_index_selector_evals`, which is documented for monitoring selector evaluation work caused by active policy rules.
- The post used `felix_active_network_policies`, but the documented Felix metric is `felix_active_local_policies`. I updated the metric name and description.
- The post used `felix_policy_evaluation_total`, which is not a documented Felix metric. I replaced it with `felix_cluster_num_policies`, which is documented as the cluster-wide policy count.
- The Grafana dashboard text referred to denial rates and policy evaluation counts based on the invalid metrics. I updated it to refer to selector evaluation rates, active policy counts, and cluster-wide policy counts.

## Review Notes
Calico Enterprise and Calico Cloud expose additional policy metrics for allowed and denied traffic, but those are separate from the Calico Open Source Felix metrics covered by this post's Calico v3.26+ prerequisite. The `kubectl patch felixconfiguration default --type=merge -p ...` command and `prometheusMetricsEnabled` field are consistent with Calico documentation.
