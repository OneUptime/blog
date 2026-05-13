# Validation Summary: How to Monitor Calico Node Not Ready Status

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- kube-state-metrics
- Prometheus Operator
- PromQL
- kubectl

## Sources Consulted
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Kubernetes node status documentation: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Prometheus Operator documentation: https://github.com/prometheus-operator/prometheus-operator
- Calico calico/node configuration documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico install node documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico operator migration documentation: https://docs.tigera.io/calico/latest/operations/operator-migration

## Issues Found
- The post stated that calico-node readiness typically precedes node NotReady by 30-60 seconds and that a 2-minute threshold alerts before node impact. Kubernetes node readiness timing and Calico failure modes vary, and a 2-minute `for` window cannot guarantee warning before node impact. Updated the wording to describe calico-node readiness as useful context and a possible early signal depending on the failure mode.
- The examples assumed calico-node always runs in `kube-system`. Manifest-based installs commonly use `kube-system`, while operator-managed installs commonly use `calico-system`. Updated the kubectl command to search all namespaces and updated PromQL namespace matchers to include both common namespaces.
- The dashboard list described `kube_pod_container_status_restarts_total` as a restart rate, but the metric is a counter. Updated the query to use `rate(...[5m])`.

## Review Notes
The PrometheusRule resource uses the stable `monitoring.coreos.com/v1` API and the kube-state-metrics metric names and labels used in the examples are current. The event watcher uses the Kubernetes-supported `reason` field selector for events. The local environment did not have `kubectl` installed, so kubectl flag verification was performed against official Kubernetes documentation rather than local `kubectl --help`.
