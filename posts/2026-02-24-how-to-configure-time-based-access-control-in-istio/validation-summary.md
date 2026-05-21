# Validation Summary: How to Configure Time-Based Access Control in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio external authorization / MeshConfig extensionProviders
- Kubernetes CronJob
- Kubernetes RBAC
- Kubernetes ConfigMap and kubectl
- Envoy Lua HTTP filter
- Go net/http
- Prometheus / PromQL

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio MeshConfig extensionProviders reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The CronJob examples described 9 AM and 6 PM schedules but did not specify `.spec.timeZone`, so Kubernetes would interpret them in the kube-controller-manager local timezone. Added `timeZone: "America/New_York"` to both CronJobs.
- The Go external authorization service read `X-Original-Url` and registered only `/check`, but Istio's HTTP external authorization request sends the request path by default and would call the authorizer using that path unless a `pathPrefix` is configured. Changed the handler to read `r.URL.Path`, register on `/`, and removed the unnecessary `includeRequestHeadersInCheck: ["x-original-url"]` setting.
- The mesh config forwarded `x-time-allowed` and `x-time-denied-reason`, but the Go service did not set those response headers. Added those headers in the allow and deny paths.
- The Lua filter added `x-time-window` without removing a client-supplied value first. Added `request_handle:headers():remove("x-time-window")` before setting the trusted gateway-generated value.
- The Prometheus alert used `hour()` and `day_of_week()` without noting that these functions evaluate UTC timestamps. Added a note to adjust the window for the policy timezone.

## Review Notes
- The examples use current Istio `security.istio.io/v1` AuthorizationPolicy APIs and Kubernetes `batch/v1` CronJobs.
- The header-based approach should only be used when the header is injected or overwritten by trusted infrastructure, such as the ingress gateway shown in the example.
