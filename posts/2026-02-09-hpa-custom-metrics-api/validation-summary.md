# Validation Summary: How to implement HPA with custom metrics API server

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Custom Metrics API
- Kubernetes API aggregation and APIService
- Kubernetes RBAC
- cert-manager Certificate resources
- Go
- Redis / go-redis
- Prometheus client instrumentation
- kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Custom Metrics API v1beta2 reference: https://kubernetes.io/docs/reference/external-api/custom-metrics.v1beta2/
- Kubernetes APIService v1 reference: https://kubernetes.io/docs/reference/kubernetes-api/apiregistration/api-service-v1/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- k8s.io/metrics custom_metrics/v1beta2 Go package reference: https://pkg.go.dev/k8s.io/metrics/pkg/apis/custom_metrics/v1beta2
- Redis Go client documentation: https://redis.io/docs/latest/develop/clients/go/

## Issues Found
- The Go server parsed the custom metrics request path with incorrect indexes. For a path such as `/apis/custom.metrics.k8s.io/v1beta2/namespaces/default/deployments/task-processor/queue_depth`, the previous code read the resource type as the namespace and could panic when reading `parts[9]`. Updated the indexes to read namespace, object name, and metric name correctly.
- The `MetricValue` response used fields that do not exist in the Kubernetes custom metrics v1beta2 Go type (`MetricName`) and referenced `v1beta2.ObjectReference`, which is not the correct type. Updated the response to use `corev1.ObjectReference`, `v1beta2.MetricIdentifier`, and `WindowSeconds` as required by the v1beta2 API.
- The Go example used the older go-redis v8 import path. Updated it to the current Redis Go client import path, `github.com/redis/go-redis/v9`.
- The caching example called an undefined `fetchFromRedis` helper and could write to a nil cache map. Added cache initialization and a matching Redis-backed helper.

## Review Notes
The Kubernetes YAML examples for the Deployment, Service, APIService, RBAC, and autoscaling/v2 HPA were consistent with the official API references. I attempted to compile the primary Go example locally, but the workspace does not have `go` or `gofmt` installed, so compilation was not run in this environment.
