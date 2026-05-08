# Validation Summary: Monitoring FailedCreatePodSandBox Errors After Installing Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Events and RBAC
- kubectl
- Calico / calico-node
- Kubernetes Event Exporter
- Prometheus Operator PrometheusRule
- kube-state-metrics
- Grafana

## Sources Consulted
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes generated kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes generated kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes generated kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kube-state-metrics concept documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics pod metric documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes Event Exporter upstream README and deployment examples: https://github.com/resmoio/kubernetes-event-exporter
- Kubernetes Event Exporter upstream source for flags and metrics: https://github.com/resmoio/kubernetes-event-exporter/blob/master/main.go and https://github.com/resmoio/kubernetes-event-exporter/blob/master/pkg/metrics/metrics.go
- Calico calico/node readiness documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The event exporter deployment used `--config=/config/config.yaml`, but the upstream exporter flag is `-conf` / `--conf`. Changed the argument to `-conf=/config/config.yaml`.
- The event exporter deployment referenced a ServiceAccount but did not define the required RBAC resources. Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources with `get`, `list`, and `watch` access for Kubernetes Events, and set `omitLookup: true` so the example does not require broad read access to involved objects.
- The text claimed the event exporter surfaced FailedCreatePodSandBox events as metrics. The referenced exporter exposes native exporter health metrics, while the provided stdout receiver routes matched events to logs. Reworded this claim to distinguish event logs from exporter health metrics.
- The stdout receiver used `layout: {}`, which would emit empty objects instead of useful event data. Changed it to `stdout: {}` so the full event is written.
- The Prometheus alert used `increase(kube_pod_container_status_waiting_reason{reason="CreateContainerError"}[10m])`, but kube-state-metrics documents this metric as a gauge and `CreateContainerError` is not the normal symptom for sandbox creation failures. Replaced it with a gauge-based `ContainerCreating` alert and updated the annotations to direct operators to check pod events for `FailedCreatePodSandBox`.
- The Grafana Stat panel query used the same incorrect `CreateContainerError` waiting reason. Updated it to count containers waiting in `ContainerCreating`.
- The troubleshooting note only mentioned the core `events` resource. Updated it to include both the core API group and `events.k8s.io`.

## Review Notes
The Prometheus rule now detects pods stuck in `ContainerCreating`, which is a practical kube-state-metrics symptom for sandbox creation failures, but exact `FailedCreatePodSandBox` reason matching still comes from Kubernetes Events. If exact event-derived Prometheus alerting is required in the future, use an exporter or log pipeline that emits event reason labels as queryable metrics or logs.
