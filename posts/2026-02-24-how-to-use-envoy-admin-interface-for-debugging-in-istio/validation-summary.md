# Validation Summary: How to Use Envoy Admin Interface for Debugging in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy admin interface
- Kubernetes
- kubectl
- istioctl

## Sources Consulted
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy ConfigDump API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump.proto
- Envoy ServerInfo API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/server_info.proto
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio health checking documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post used `istioctl dashboard envoy`, which the current Istio command reference marks as deprecated. Changed the example to `istioctl dashboard proxy`.
- The retry statistic example used `retry.upstream_rq`, which is not the total retry counter. Changed it to `upstream_rq_retry`, matching Envoy cluster statistics.
- The `/logging` examples used a GET request to list loggers and query parameters for multiple logger changes. Envoy documents `/logging` as a POST endpoint and documents `paths=<logger>:<level>,...` for changing multiple logger levels. Updated those commands.
- The `/ready` section said Kubernetes readiness probes use Envoy's admin `/ready` endpoint. Envoy documents `/ready` as usable for readiness, but Istio-injected sidecars typically use the Istio agent endpoint on port 15021 at `/healthz/ready`. Updated the wording.
- The `/drain_listeners` example implied a graceful drain while using the bare endpoint. Envoy documents `?graceful` for a graceful drain period and `skip_exit` to avoid exiting after that period. Updated the command and explanation.

## Review Notes
The remaining commands and endpoint descriptions are consistent with the official Envoy, Istio, and Kubernetes documentation reviewed. The `remaining_*` circuit breaker metrics are accurate, but Envoy only emits them when circuit breaker `track_remaining` is enabled.
