# Validation Summary: Monitoring for Duplicate IPv4 Address Errors in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Alertmanager
- Grafana
- calicoctl

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Monitoring kube-controllers with Prometheus - https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: calicoctl patch - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Enterprise documentation: calicoctl ipam check - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Prometheus Operator documentation: Getting Started and ServiceMonitor behavior - https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator documentation: API reference - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post said to ensure both Felix and Typha expose metrics, but the command only enables Felix metrics. Changed the wording to refer only to Felix.
- The ServiceMonitor example selected labels directly without creating a Service and referenced a port name that was not defined. Added a headless `felix-metrics-svc` Service with a named `metrics` port and updated the ServiceMonitor to scrape that port.
- The `CalicoNodeNotReady` alert used `up{job="calico-node"}`, which does not reliably match targets created by the ServiceMonitor. Updated it to match the namespace and service labels for the Felix metrics service.
- The metric `felix_iptables_save_errors_total` does not match the current Felix metric reference. Changed it to `felix_iptables_save_errors`.
- The metric `felix_ipam_blocks_per_node` is not a Felix metric. Changed it to the kube-controllers metric `ipam_blocks_per_node` and adjusted the surrounding wording.
- The dashboard metric `felix_iptables_lines` does not match the current Felix metric reference. Changed it to `felix_iptables_rules`.
- The dashboard text mentioned policy calculation time without listing the matching metric. Added `felix_calc_graph_update_time_seconds`.
- The recovery checklist labeled `calicoctl node status` as a node-to-node connectivity test, but that command reports BGP peer status. Updated the label.
- The recovery checklist used HTTP against `kubernetes.default.svc`, which normally serves HTTPS. Updated the command to use HTTPS with certificate checking disabled for a basic in-cluster service reachability check.

## Review Notes
The post is technically relevant and salvageable. Future improvements could include a separate Typha metrics Service/ServiceMonitor example for clusters that use Typha, and kube-controllers scraping if the IPAM metrics are included in dashboards.
