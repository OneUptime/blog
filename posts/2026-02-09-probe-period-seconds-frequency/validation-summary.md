# Validation Summary: How to Use Probe periodSeconds to Control Health Check Frequency

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes probes
- Kubernetes Pod configuration
- Prometheus/PromQL
- Go HTTP handlers

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes API reference: Pod v1 probe fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus documentation: Query functions and histogram_quantile - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Go standard library documentation: net/http, sync, time - https://pkg.go.dev/std

## Issues Found
- The post stated that Kubernetes runs probes exactly at `periodSeconds` intervals after the initial delay. Updated the wording to note that this is generally true, but readiness probes may run sooner while a container is not Ready, matching Kubernetes documentation.
- The liveness examples described restart timing as exact. Updated comments to describe an approximate detection window, since the actual restart timing also depends on probe scheduling, timeout behavior, and container restart/termination time.
- The readiness example said removal and re-addition happen after exact times. Updated the comments to use "up to" for removal and to say the Pod is added back after the next successful check.
- The health-check volume calculation assumed probes run exactly at the configured interval. Added a short comment making that assumption explicit.

## Review Notes
The Kubernetes probe field names and defaults are current. The PromQL examples use Kubernetes kubelet probe metrics that exist in the Kubernetes metrics reference; `prober_probe_duration_seconds` is currently alpha, so dashboards and alerts using it may need review during Kubernetes upgrades.
