# Validation Summary: Monitoring for ClusterIP Reachability Errors in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes Services and ClusterIP networking
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Prometheus metrics and Alertmanager alerting
- Grafana dashboards
- calicoctl

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: calicoctl patch: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source documentation: calicoctl ipam overview: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source documentation: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Prometheus Operator API reference: ServiceMonitor endpoints: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation: API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/

## Issues Found
- The Step 1 text said to ensure both Felix and Typha metrics were exposed, but the commands only enabled Felix metrics. Changed the wording to Felix only so the setup matches the example.
- The `calicoctl patch` command set `prometheusMetricsPort` directly and used shorthand patch syntax. Current Calico documentation enables Felix metrics with `--patch '{"spec":{"prometheusMetricsEnabled": true}}'`, and Felix publishes on TCP port 9091 by default. Updated the command accordingly.
- The ServiceMonitor example selected `k8s-app: calico-node` directly and referenced a port named `http-metrics`, but ServiceMonitor selects Services, not pods. Added a headless `felix-metrics-svc` Service with a named `http-metrics` port and updated the ServiceMonitor selector to match it.
- The `CalicoNodeNotReady` alert used `up{job="calico-node"}`, which is not a reliable label for the ServiceMonitor shown. Updated it to match the service and namespace labels produced for the Felix metrics Service.
- The metric `felix_iptables_save_errors_total` is not listed in the Calico Felix Prometheus metric reference; the current metric is `felix_iptables_save_errors`. Updated the metric name.
- The metric `felix_ipam_blocks_per_node` is not listed as a Felix metric. Replaced it with `felix_iptables_rules`, which is documented and fits the dashboard context.
- The dashboard snippet used `felix_iptables_lines`, which is not the documented active rule count metric. Replaced it with `felix_iptables_rules`.
- The recovery checklist used `calicoctl ipam check`, which is documented under Calico Enterprise rather than Calico Open Source. Replaced it with `calicoctl ipam show --show-blocks`, which is available in the open source calicoctl IPAM command set.
- The pod connectivity test used the deprecated Kubernetes `/healthz` endpoint over plain HTTP against `kubernetes.default.svc`. Updated it to use HTTPS and `/readyz`, which Kubernetes recommends instead of `/healthz`.

## Review Notes
The post is technically relevant and salvageable. The monitoring approach remains high level; future improvements could include a note that Typha metrics require separate operator or manifest configuration when Typha is deployed, and that Prometheus label names may vary with kube-prometheus-stack configuration.
