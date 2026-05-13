# Validation Summary: How to Monitor the Impact of External IP Policies in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico `NetworkPolicy` and `GlobalNetworkPolicy`
- Felix Prometheus metrics
- Prometheus Operator `PrometheusRule`
- Grafana

## Sources Consulted
- Calico documentation: Use external IPs or networks rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described "External IP Policies" as though it were a distinct Calico feature. Updated the wording to describe Calico network policies for external IPs, which are implemented with CIDR `nets` rules or network sets in `NetworkPolicy` and `GlobalNetworkPolicy`.
- The PromQL examples used undocumented Felix metric names: `felix_denied_packets_total`, `felix_active_network_policies`, and `felix_policy_evaluation_total`. Replaced them with documented Calico OSS Felix metrics: `felix_active_local_policies`, `felix_cluster_num_policies`, `felix_label_index_selector_evals`, `felix_int_dataplane_failures`, and `felix_iptables_restore_errors`.
- The alert example depended on the nonexistent `felix_denied_packets_total` metric. Replaced it with a selector evaluation rate alert using `felix_label_index_selector_evals`.
- The Grafana dashboard guidance referred to denial rates and policy evaluation counts from nonexistent metrics. Updated it to reference documented Felix metrics for active policies, selector evaluation, and dataplane errors.
- The architecture diagram implied that an external IP policy always sends traffic to a destination pod. Updated the allowed destination label to cover either a destination workload or an external endpoint.

## Review Notes
Calico Enterprise has additional policy metrics such as denied packet counters on a separate policy metrics endpoint, but those are not part of the standard Calico Open Source Felix metrics referenced by this post. The corrected version stays within documented Calico OSS metrics for the stated Calico v3.26+ prerequisite.
