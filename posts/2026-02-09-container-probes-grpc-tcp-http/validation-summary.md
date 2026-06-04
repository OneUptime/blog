# Validation Summary: How to Use Container Probes with gRPC, TCP, and HTTP Check Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes liveness, readiness, and startup probes
- HTTP, TCP socket, gRPC, and exec probe handlers
- Python Flask health endpoints
- Go gRPC health checking
- kubectl
- Prometheus alerting
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Pod Lifecycle / Container probes - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics
- gRPC documentation: Health Checking - https://grpc.io/docs/guides/health-checking/
- Go package documentation: google.golang.org/grpc/health/grpc_health_v1 - https://pkg.go.dev/google.golang.org/grpc/health/grpc_health_v1

## Issues Found
No technical issues found.

## Review Notes
The Kubernetes probe examples use valid probe fields and match current Kubernetes behavior. gRPC container probes are stable in Kubernetes v1.27 and later; current Kubernetes documentation also notes caveats worth considering in future revisions, including that gRPC probes do not support named ports, custom hostnames, or authentication parameters. The Prometheus `prober_probe_total` metric and labels match the current Kubernetes metrics reference, where the metric is beta.
