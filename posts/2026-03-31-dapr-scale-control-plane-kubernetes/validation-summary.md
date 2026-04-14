# Validation Summary: How to Scale Dapr Control Plane on Kubernetes

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr (control plane components: operator, sentry, sidecar injector, placement server)
- Kubernetes (Deployments, StatefulSets, pod anti-affinity, kubectl)
- Helm (Dapr Helm chart configuration)
- Raft consensus protocol (placement server clustering)
- Prometheus metrics

## Sources Consulted
- Dapr Production Guidelines on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Services Overview: https://docs.dapr.io/concepts/dapr-services/
- Dapr Placement Service Overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Helm Chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Metrics Configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Kubernetes Recommended Labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/

## Issues Found
No technical issues found.

## Review Notes
- The post lists four control plane components, which is the traditional and widely-documented set. However, Dapr 1.14+ introduced `dapr-scheduler` as an additional control plane component. A future update could add this to the component table for completeness.
- The anti-affinity label selector uses `app: dapr-operator`, which works correctly. Dapr also supports Kubernetes recommended labels (`app.kubernetes.io/name`, `app.kubernetes.io/component`), which could be used as an alternative for stricter compliance with Kubernetes labeling conventions.
- The placement server is correctly identified as a StatefulSet using Raft consensus. In HA mode, placement is fixed at 3 replicas regardless of `global.ha.replicaCount`.
- All Helm value keys use the correct snake_case format (`dapr_operator`, not `daprOperator`).
- The placement health check endpoint (port 8080, `/healthz`) is correct.
- The operator metrics port-forward to 9090 is correct for the default Dapr metrics configuration.
