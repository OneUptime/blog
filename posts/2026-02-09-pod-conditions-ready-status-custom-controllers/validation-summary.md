# Validation Summary: How to Manage Pod Conditions and Ready Status with Custom Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and Pod conditions
- Kubernetes readiness gates
- Kubernetes custom controllers
- Kubernetes client-go
- Kubernetes Python client
- Kubernetes RBAC
- EndpointSlice API
- Prometheus alerting / kube-state-metrics

## Sources Consulted
- Kubernetes Pod Conditions documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- client-go workqueue package documentation: https://pkg.go.dev/k8s.io/client-go/util/workqueue
- client-go cache package documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache
- Kubernetes Python client model documentation: https://k8s-python.readthedocs.io/en/stable/kubernetes.client.models.html
- kube-state-metrics Pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The Go controller created a work queue but never initialized, started, or synced an informer, so no pods would be enqueued. Added a pod informer, event handlers, cache startup, cache sync waiting, and an enqueue helper.
- The Go controller used deprecated untyped client-go workqueue APIs. Updated the example to use `TypedRateLimitingInterface`, `NewTypedRateLimitingQueue`, and `DefaultTypedControllerRateLimiter`.
- The Go controller treated deleted pods as sync errors. Added `apierrors.IsNotFound` handling so deleted pods are ignored after watch/delete races.
- The Go status update used a full status update. Changed it to patch the pod status subresource, matching Kubernetes guidance for setting custom readiness conditions.
- The dependency-checking Go snippet used the deprecated Endpoints API and had an unused `svc` variable. Updated it to check EndpointSlices through `discovery.k8s.io/v1`, handle nil `ready` values correctly, and avoid the unused variable.
- The dependency parser could panic on malformed dependency annotations and silently ignored unsupported dependency types. Added validation for `service/name` or `pod/name`.
- The RBAC example did not grant permissions required by the dependency-checking snippet. Added `services` get access and `endpointslices` access.
- The readiness gate example listed `DependenciesReady`, but the main controller only sets `CustomHealthy`. Removed the unmanaged gate from the basic readiness gate example.
- The Python example used `client.V1Time()`, which is not the correct way to provide timestamp values in the official Python client. Replaced it with timezone-aware `datetime` values.
- The Python example assumed pod labels and annotations were always non-null. Added safe defaults for both.
- The Python status patch sent the whole pod object. Changed it to patch only `status.conditions`.
- The Prometheus alert wording implied kube-state-metrics exports arbitrary custom pod conditions by default. Clarified that the alert applies if the monitoring stack exports custom pod conditions.
- The best-practice example for prefixed custom condition names did not use the Kubernetes label-key style prefix. Changed it to `example.com/DatabaseConnectivity`.

## Review Notes
The examples are now aligned with current Kubernetes readiness gate and EndpointSlice guidance. A production controller should still add conflict handling around status patches and should document any custom metrics exporter used for non-standard Pod condition alerts, because kube-state-metrics' documented Pod metrics do not include arbitrary custom Pod condition types by default.
