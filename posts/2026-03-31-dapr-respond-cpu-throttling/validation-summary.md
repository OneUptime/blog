# Validation Summary: How to Respond to Dapr CPU Throttling Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar architecture, annotations, Configuration CRD)
- Kubernetes (kubectl, pod resource limits, HorizontalPodAutoscaler, rolling restarts)
- Linux cgroups (CFS bandwidth control, cpu.stat)
- Prometheus (cadvisor container CPU metrics)
- gRPC (app-to-sidecar protocol optimization)

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration spec (tracing/samplingRate): https://docs.dapr.io/operations/configuration/configuration-overview/
- Kubernetes cadvisor metrics (container_cpu_cfs_throttled_periods_total, container_cpu_cfs_periods_total, container_cpu_cfs_throttled_seconds_total): https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Kubernetes HorizontalPodAutoscaler v2 API: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- Linux CFS bandwidth control (cpu.stat fields): https://www.kernel.org/doc/Documentation/scheduler/sched-bwc.txt

## Issues Found
1. **Incorrect Prometheus metric in throttle ratio query**: The numerator used `container_cpu_cfs_throttled_seconds_total` (total throttled duration in seconds) divided by `container_cpu_cfs_periods_total` (count of CFS enforcement periods). This produces a value in seconds-per-period, not a dimensionless throttle ratio. Fixed the numerator to `container_cpu_cfs_throttled_periods_total` (count of throttled periods), which correctly produces a ratio between 0 and 1 representing the fraction of periods that were throttled.

## Review Notes
- The cgroup path `/sys/fs/cgroup/cpu/cpu.stat` is specific to cgroup v1. Kubernetes clusters running on newer kernels with cgroup v2 use `/sys/fs/cgroup/cpu.stat` instead. This is not incorrect since cgroup v1 remains widely deployed, but readers on cgroup v2 systems should be aware of the different path.
- All Dapr annotations (`dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-cpu-request`, `dapr.io/app-protocol`, `dapr.io/app-port`) are correctly named per the Dapr documentation.
- The Dapr Configuration CRD for tracing (`spec.tracing.samplingRate` as a string value) is correct.
- The HPA manifest is well-formed for the `autoscaling/v2` API version.
- The claim that Dapr sidecars use gRPC for sidecar-to-sidecar communication is accurate.
