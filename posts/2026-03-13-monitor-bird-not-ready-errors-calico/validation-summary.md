# Validation Summary: How to Monitor for BIRD Not Ready Errors in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Prometheus Operator
- Prometheus alerting rules
- kube-state-metrics
- calicoctl

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Configuring calico/node - https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: Troubleshooting and diagnostics - https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: CalicoNodeStatus resource - https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes field selectors documentation - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl events reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post implied the Calico Felix metrics endpoint exposes BIRD/BGP metrics. Calico Open Source documentation describes Felix and Typha component metrics on the Calico metrics path, while BGP state should be checked through BIRD readiness, calicoctl, CalicoNodeStatus, or product-specific BGP metrics where available. I changed the wording to "Felix Prometheus metrics" and removed the `grep -i "bird\|bgp"` check against port 9091.
- The PodMonitor used `port: http-metrics`, but the Prometheus Operator requires `PodMonitor.spec.podMetricsEndpoints[].port` to match a named pod container port. Calico's documented approach exposes Felix metrics through a Service on port 9091. I replaced the PodMonitor with a headless Service and ServiceMonitor using a named service port.
- The `CalicoNodeBIRDNotReady` alert used `up{job="calico-node"} == 0`, which detects failed scraping rather than BIRD readiness, and the `job` label would not reliably match the shown monitor. I changed it to use `kube_pod_container_status_ready` for the calico-node container and added a separate metrics-scrape alert.
- The Kubernetes event watch used `--field-selector involvedObject.name=calico-node`, but Event field selectors match exact object names and DaemonSet pods are named with generated suffixes. I changed the command to resolve an actual calico-node pod name and use `kubectl events --for pod/<name> --watch`.
- The prevention section suggested a `calicoctl node status` CronJob, but Calico documents that `calicoctl node status` is a node-local command. I changed this to recommend `CalicoNodeStatus` resources or a host-level check.

## Review Notes
- The examples assume Calico is installed in `kube-system`. Operator-based Calico installations often use `calico-system`; users should adjust namespaces and selectors for their cluster.
- The PrometheusRule examples require kube-state-metrics for the `kube_pod_container_status_ready` and restart metrics.
