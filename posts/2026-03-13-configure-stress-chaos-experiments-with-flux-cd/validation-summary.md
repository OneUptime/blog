# Validation Summary: How to Configure Stress Chaos Experiments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Chaos Mesh
- StressChaos
- Chaos Mesh Schedule
- Horizontal Pod Autoscaler
- kubectl
- Prometheus / cAdvisor metrics

## Sources Consulted
- Chaos Mesh StressChaos documentation: https://chaos-mesh.org/docs/2.6.7/simulate-heavy-stress-on-kubernetes/
- Chaos Mesh Schedule documentation: https://chaos-mesh.org/docs/next/define-scheduling-rules/
- Chaos Mesh v2.8.2 StressChaos API source: https://github.com/chaos-mesh/chaos-mesh/blob/v2.8.2/api/v1alpha1/stresschaos_types.go
- Chaos Mesh v2.8.2 Schedule API source: https://github.com/chaos-mesh/chaos-mesh/blob/v2.8.2/api/v1alpha1/schedule_types.go
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- The CPU stress explanation said Chaos Mesh spawns worker goroutines. Chaos Mesh exposes worker counts for stress processes/threads, not Go goroutines in the target workload. Changed this to "worker threads."
- The memory stress YAML comment described `--timeout=30` as the time between allocation spikes. `--timeout` limits stress process runtime; it is not an allocation spike interval. Updated the comment accordingly.
- The best practices section referenced `targetCPUUtilizationPercentage`, which is specific to older HPA API examples. Changed it to the more version-neutral "HPA CPU utilization target."
- The Prometheus throttling metric was listed as `cpu_throttled_seconds_total`, but cAdvisor exposes `container_cpu_cfs_throttled_seconds_total`. Updated the metric name.

## Review Notes
The Chaos Mesh `StressChaos`, `Schedule`, and Flux `Kustomization` snippets use valid API groups, kinds, and field names for current documented APIs. The `kubectl get events --field-selector reason=OOMKilling` command uses a supported Event field selector, but event availability and retention depend on the cluster's event backend and timing.
