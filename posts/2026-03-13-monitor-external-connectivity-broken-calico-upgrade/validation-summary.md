# Validation Summary: How to Monitor for External Connectivity Broken After Calico Upgrade

## Status
validated

## Post Type
Troubleshooting and monitoring guide

## Technologies Covered
- Calico
- Calico Felix metrics
- Kubernetes
- Prometheus Operator Probe, ServiceMonitor, and PrometheusRule resources
- Prometheus Blackbox Exporter
- kube-state-metrics

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Prometheus Operator API reference for Probe, ServiceMonitor, and PrometheusRule resources: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Blackbox Exporter multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Calico source for Felix iptables metric labels: https://github.com/projectcalico/calico/blob/master/felix/iptables/table.go

## Issues Found
- The introduction referred to `felix_iptables_chains` while the alert and verification query used `felix_iptables_rules{table="nat"}`. I aligned the text to `felix_iptables_rules{table="nat"}` because Felix exposes `felix_iptables_rules` with `ip_version` and `table` labels.
- The post implied a NAT rule metric drop is always an early warning before impact. I changed this to a corroborating signal because disabling `natOutgoing` can cause egress impact at the same time the rules change.
- The blackbox probe used `https://1.1.1.1` and `https://8.8.8.8` with the `http_2xx` module. I replaced them with stable HTTPS endpoints, `https://one.one.one.one` and `https://dns.google`, to avoid depending on HTTPS behavior for bare DNS resolver IPs.
- The Felix metrics example used a `PodMonitor` with `port: felix-metrics-svc`, but Prometheus Operator `PodMonitor` endpoint ports must match pod container port names. I replaced it with a headless Service plus ServiceMonitor using a named `metrics` Service port.
- The post omitted that Felix metrics are disabled by default. I added the documented `calicoctl patch felixconfiguration default --type=merge --patch '{"spec":{"prometheusMetricsEnabled":true}}'` command before the scrape configuration.
- The verification section gave a fixed expectation of `> 10` NAT rules when `natOutgoing` is enabled. I changed it to expect stable non-zero values on nodes where Felix is programming NAT rules, since exact rule counts vary by cluster and dataplane state.

## Review Notes
The examples assume Calico is installed in `kube-system`; operator-based Calico installations commonly use `calico-system`, so users may need to adjust namespaces. Prometheus discovery still depends on the Prometheus instance selecting Probe, ServiceMonitor, and PrometheusRule resources from the namespaces shown.
