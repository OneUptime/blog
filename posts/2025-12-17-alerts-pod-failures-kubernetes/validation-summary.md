# Validation Summary: How to Set Up Alerts for Pod Failures in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and pod lifecycle
- kube-state-metrics
- Prometheus and PromQL alerting rules
- Prometheus Operator PrometheusRule CRD
- Alertmanager routing and receivers
- Grafana dashboards
- Helm
- kubectl

## Sources Consulted
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm repo add command reference: https://helm.sh/docs/helm/helm_repo_add/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post described CrashLoopBackOff, ImagePullBackOff, and OOMKilled as pod failure states. Kubernetes documents pod phases separately from container states and kubectl status display values, so I changed the section to "Pod Failure Signals" and updated the diagram and table to distinguish pod phases from container-level reasons.
- The CrashLoopBackOff wording said the pod enters a CrashLoopBackOff state. I changed this to say a container reports the CrashLoopBackOff waiting reason, matching kube-state-metrics' `kube_pod_container_status_waiting_reason` metric.
- The OOMKilled alert and dashboard wording implied a fresh event stream. The referenced metric is `kube_pod_container_status_last_terminated_reason`, so I changed the language to "last termination reason" and "last terminations."
- The PodNotReady alert used `kube_pod_status_phase{phase=~"Pending|Unknown"}`, which does not actually test Pod readiness. I changed the alert examples to use `kube_pod_status_ready{condition="false"}` and exclude Job-owned pods with `unless`.
- The Alertmanager route examples used the deprecated `match` field. I changed them to the current `matchers` syntax and updated the PagerDuty receiver example to use `routing_key`.

## Review Notes
- The `kube_pod_container_status_last_terminated_reason` metric is marked experimental in the kube-state-metrics pod metrics reference; it is commonly used, but future kube-state-metrics versions may change experimental metrics.
- The PrometheusRule example assumes Prometheus Operator is installed and that the Prometheus instance selects rules labeled `release: prometheus`; this selector label is deployment-specific.
- The local environment did not have `helm`, `kubectl`, or `promtool` installed, so command verification was performed against official documentation rather than local CLI help.
