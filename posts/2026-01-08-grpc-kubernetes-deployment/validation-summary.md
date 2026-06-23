# Validation Summary: How to Deploy gRPC Services to Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC (Go implementation, `google.golang.org/grpc`)
- gRPC Health Checking Protocol / `grpc-health-probe`
- Docker (multi-stage builds, Alpine)
- Kubernetes (Deployment, Service, ConfigMap, Secret, ServiceAccount/RBAC, NetworkPolicy, PodDisruptionBudget)
- Horizontal Pod Autoscaler (`autoscaling/v2`)
- KEDA (`keda.sh/v1alpha1` ScaledObject, Prometheus scaler)
- Prometheus / ServiceMonitor (`monitoring.coreos.com/v1`)
- grpcurl

## Sources Consulted
- gRPC Go health package & server options — https://pkg.go.dev/google.golang.org/grpc
- grpc-health-probe releases — https://github.com/grpc-ecosystem/grpc-health-probe/releases
- KEDA Prometheus scaler docs — https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA `metricName` deprecation notice — https://github.com/kedacore/keda-docs/pull/1072/files
- Kubernetes HPA `autoscaling/v2` reference — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes probes / native gRPC probe — https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- **KEDA Prometheus trigger `metricName` field (removed in KEDA v2.12).** Both Prometheus triggers in the KEDA `ScaledObject` example included a `metricName` field in the trigger `metadata`. This parameter was deprecated in KEDA v2.10 and removed in v2.12; the Prometheus scaler now auto-generates the metric name. On current KEDA versions the field is simply ignored, but keeping it in a "current best practice" example is misleading. Removed the `metricName: grpc_server_handled_total` and `metricName: grpc_server_started_total` lines, leaving the still-required `serverAddress`, `threshold`, and `query` fields intact.

## Review Notes
- `grpc-health-probe v0.4.24` (pinned in the Dockerfile) is a real, valid release. It is not the latest (the project is past v0.4.40+), but pinning a known version is correct practice, so it was left as-is. Readers on Kubernetes 1.24+ could alternatively use the native `grpc:` probe type instead of the `exec` + `grpc_health_probe` approach; the post's approach remains fully valid.
- The Go service code, server options (`grpc.MaxRecvMsgSize`/`grpc.MaxSendMsgSize`), health server registration, reflection, and graceful-shutdown logic are all correct against the current gRPC-Go API.
- The pod template advertises Prometheus metrics on port 9090 (`prometheus.io/*` annotations and a `metrics` container port), and the ServiceMonitor scrapes `/metrics`, but the sample Go `main.go` does not actually start a metrics HTTP server. This is a gap in the illustrative sample rather than a technical error — a real deployment would need to expose `/metrics` (e.g., via `go-grpc-prometheus` + a `promhttp` handler) for those annotations and the ServiceMonitor to function.
- The `grpc_server_handled_total` / `grpc_server_started_total` metric names referenced in the KEDA queries and monitoring section come from the `go-grpc-prometheus` middleware and are accurate.
- Cloud annotations (AWS NLB type, cross-zone LB, GCP `cloud.google.com/app-protocols`) and the `autoscaling/v2` HPA `behavior` block are all valid for current Kubernetes/cloud-controller versions.
