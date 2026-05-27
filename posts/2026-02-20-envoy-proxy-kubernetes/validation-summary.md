# Validation Summary: How to Use Envoy Proxy as a Sidecar in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy
- Kubernetes Deployments, Services, Pods, ConfigMaps, probes, and port forwarding
- Envoy listeners, HTTP connection manager, routes, clusters, health checks, circuit breakers, local rate limiting, access logs, admin interface, and OpenTelemetry tracing
- Prometheus metrics scraping

## Sources Consulted
- Envoy command line options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Envoy administration interface: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Envoy HTTP local rate limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy cluster configuration API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy HTTP connection manager API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy OpenTelemetry tracer API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy version history: https://www.envoyproxy.io/docs/envoy/latest/version_history/current
- Envoy Docker image documentation / registry tag check: https://hub.docker.com/r/envoyproxy/envoy
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The Deployment used `envoyproxy/envoy:v1.31-latest`, which points to an older Envoy minor release. Updated it to `envoyproxy/envoy:v1.37-latest`, a currently supported stable minor release, and verified the tag exists in the container registry.
- The `kubectl port-forward` command omitted the `production` namespace even though the example Deployment is created in that namespace. Added `-n production` so the command works as written.

## Review Notes
- The Envoy admin interface examples are technically valid, but binding admin to `0.0.0.0` should be protected with Kubernetes NetworkPolicy or an equivalent control in production because the admin API exposes sensitive operational endpoints.
- The OpenTelemetry tracer configuration matches Envoy's documented API, but Envoy currently documents this extension as work-in-progress, so production users should verify support against their chosen Envoy release.
