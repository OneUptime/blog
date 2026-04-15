# Validation Summary: How to Plan Dapr Capacity for Production Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, control plane, actors, placement service)
- Kubernetes (resource requests/limits, annotations, service DNS, kubectl)
- KEDA (ScaledObject for autoscaling)
- Redis (as pub/sub backend for KEDA trigger)
- hey (HTTP load testing tool)
- k6 (mentioned as load testing alternative)

## Sources Consulted
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr production guidelines on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Kubernetes overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- hey GitHub repository: https://github.com/rakyll/hey
- Kubernetes resource management documentation

## Issues Found
No technical issues found.

## Review Notes
- All Dapr sidecar annotations (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-memory-limit`) are correct and current.
- The bash arithmetic for total sidecar overhead and actor memory estimation is accurate.
- The control plane Helm values use the correct key format (`dapr_operator`, `dapr_placement`) matching Dapr's Helm chart.
- The KEDA ScaledObject uses `keda.sh/v1alpha1` which is the current apiVersion. Future KEDA releases may graduate this to a stable version.
- The Redis trigger `listName` uses Dapr's `{app-id}||{topic}` naming convention, which is correct for Dapr's Redis pub/sub implementation.
- The `hey` installation command and flags are correct. The load test URL uses standard Kubernetes service DNS.
- The actor memory variable is named `PLACEMENT_MEM_MB` but outputs with `Mi` suffix — a cosmetic naming inconsistency, but the math and output are correct for Kubernetes binary units.
