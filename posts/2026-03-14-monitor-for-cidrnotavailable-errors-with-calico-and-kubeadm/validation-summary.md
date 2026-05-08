# Validation Summary: Monitoring for CIDRNotAvailable Errors in Calico and kubeadm

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- kubeadm
- Prometheus Operator
- PrometheusRule and ServiceMonitor CRDs
- calicoctl
- Grafana

## Sources Consulted
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Monitoring kube-controllers with Prometheus, https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: Get started with IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: Felix configuration, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl run reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The introduction incorrectly described CIDRNotAvailable as Calico being unable to allocate a CIDR block. Updated it to clarify that CIDRNotAvailable is a Kubernetes node CIDR allocation event, while Calico IPPool mismatch or exhaustion can still cause related pod IP allocation failures.
- The metrics setup said to ensure Felix and Typha were exposing metrics, but only showed Felix configuration. Updated the wording to make Typha conditional and separate.
- The ServiceMonitor example selected `k8s-app: calico-node` directly without defining a Service with a matching label and named metrics port. Added a headless Service for Felix metrics and changed the ServiceMonitor endpoint to use the Service port name.
- The `CalicoNodeNotReady` alert used `up{job="calico-node"}` without guaranteeing that job label. Added `jobLabel: k8s-app` to the ServiceMonitor and scoped the alert to the `calico-system` namespace.
- The metric `felix_iptables_save_errors_total` is not the current Felix metric name. Changed it to `felix_iptables_save_errors`.
- The metric `felix_ipam_blocks_per_node` is not the current kube-controllers metric name. Changed it to `ipam_blocks`, noting that it comes from calico-kube-controllers metrics.
- The dashboard example used `felix_iptables_lines`, which is not listed in current Felix metrics. Changed it to `felix_iptables_rules`.
- The recovery checklist used HTTP against `kubernetes.default.svc`, which exposes HTTPS and was labeled as pod-to-pod connectivity. Replaced it with a BusyBox DNS lookup and relabeled the layer as cluster DNS and service reachability.

## Review Notes
The guide is technically relevant and useful, but full CIDRNotAvailable alerting usually also needs Kubernetes event collection in addition to Calico component metrics. The post now preserves the author's monitoring focus while avoiding incorrect claims about Calico IPAM and Kubernetes node CIDR allocation.
