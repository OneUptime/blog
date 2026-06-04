# Validation Summary: How to Configure Probe failureThreshold and successThreshold for Stability

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probe behavior
- Kubernetes Pod and Deployment configuration
- Prometheus / PromQL monitoring queries
- kube-state-metrics
- Flask test application
- kubectl debugging commands

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes API reference: Pod v1 probe fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes API reference: Deployment apps/v1 required fields: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes metrics reference: probe metrics: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes documentation: kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- Several `apps/v1` Deployment examples omitted `spec.selector` and matching pod template labels. Added selectors and matching `template.metadata.labels` so the examples are valid Deployment manifests.
- The `kube_pod_status_ready{condition="false"}` example used `count by (namespace, deployment)` without filtering for active false-valued series and without a native `deployment` label. Changed it to `sum by (namespace) (kube_pod_status_ready{condition="false"} == 1)`.
- The probe duration PromQL example used `probe_failure_duration_seconds_bucket`, which is not a standard Kubernetes probe metric. Changed it to the official kubelet histogram metric `prober_probe_duration_seconds_bucket` and updated the comment to describe probe latency.
- The failure simulation example used a 25-second failure as safely below a 30-second threshold. Depending on probe scheduling, three failures can still occur within that window. Changed the short failure to 15 seconds and the long failure to 45 seconds to make the expected restart behavior less timing-sensitive.

## Review Notes
- Kubernetes readiness probes may run sooner than `periodSeconds` while a container is not Ready, so threshold timing examples should be treated as approximate operational guidance rather than exact wall-clock guarantees.
- `prober_probe_duration_seconds` is currently documented as an alpha Kubernetes metric, while `prober_probe_total` is beta in the current metrics reference. Dashboards using alpha metrics should be reviewed during Kubernetes upgrades.
