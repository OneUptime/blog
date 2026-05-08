# Validation Summary: Monitoring for Data Store Initialization Errors in Calico

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Calico Open Source
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
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The introduction overstated the blast radius by saying kube-controllers datastore initialization problems block all pod networking. Updated the wording to distinguish calico-node/CNI datastore failures from kube-controllers failures.
- Step 1 said to ensure Felix and Typha metrics were exposed but only showed Felix configuration. Added the documented operator patch for enabling Typha metrics when Typha is used.
- The ServiceMonitor example selected `k8s-app: calico-node` but did not create the Kubernetes Service that ServiceMonitor resources discover. Added a headless `felix-metrics-svc` Service with a named `http-metrics` port and kept the ServiceMonitor targeting that named port.
- The `CalicoNodeNotReady` alert used `up{job="calico-node"}`, which is not a reliable label for the ServiceMonitor configuration shown. Updated it to match the exposed `felix-metrics-svc` Service label.
- Corrected inaccurate metric names: `felix_iptables_save_errors_total` to `felix_iptables_save_errors`, `felix_ipam_blocks_per_node` to `ipam_blocks`, and `felix_iptables_lines` to `felix_iptables_rules`.
- Updated the metric section to say it covers Felix and kube-controllers metrics, since IPAM metrics are exported by kube-controllers rather than Felix.

## Review Notes
- The examples assume an operator-style Calico installation in the `calico-system` namespace. Manifest-based installs often use `kube-system`, so future improvements could add an explicit note to adjust namespaces for the installation method.
- The post is now technically valid for its stated Calico v3.26+ scope, with the usual caveat that Prometheus Operator label selectors such as `release: prometheus` must match the local kube-prometheus-stack installation.
