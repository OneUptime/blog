# Validation Summary: How to Understand Envoy Response Flags in Istio Access Logs

## Status
validated

## Post Type
Technical reference guide

## Technologies Covered
- Istio
- Envoy access logs
- Envoy response flags
- Kubernetes kubectl
- istioctl proxy-config
- Prometheus PromQL
- PrometheusRule custom resources

## Sources Consulted
- Envoy access log command operators and response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Istio Envoy access logs default format: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio standard metrics and response_flags label: https://istio.io/latest/docs/reference/config/metrics/
- Istio DestinationRule connection pool settings: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService timeout field: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio istioctl proxy-config command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio external authorization with AuthorizationPolicy CUSTOM action: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/

## Issues Found
- The JSON access log example contained an ellipsis, making the snippet invalid JSON. Removed the ellipsis and trailing comma.
- The section title claimed a complete response flag reference, but it listed only selected common flags. Changed the title to "Common Response Flags Reference."
- The description of a dash response flag said the response was normal. Envoy documents this as an unset or empty value, so the text now says no response flags were set.
- The UH explanation said Envoy found the service but all endpoints were unhealthy. Envoy defines UH as no healthy upstream hosts in the upstream cluster, so the wording was corrected.
- istioctl examples used the shorthand `deploy/source-service`. The official istioctl examples use `deployment/<deployment-name>`, so the examples were updated to `deployment/source-service`.
- The UO DestinationRule field list included `maxPendingRequests`, which is not the Istio field name, and included `maxRequestsPerConnection` as if it directly caused overflow. Replaced it with the documented connection pool limits `maxConnections`, `http1MaxPendingRequests`, `http2MaxRequests`, and `maxRetries`.
- The NR explanation implied a missing VirtualService or nonexistent Kubernetes service as the primary cause. It now focuses on no matching route and notes VirtualService and ServiceEntry cases more accurately.
- RLSE was described as an external rate-limit decision. Envoy defines RLSE as a rate limit service error, so the description was corrected.
- LH was described as the Envoy sidecar itself being unhealthy. Envoy defines it as the local service failing a health check request, so the description was corrected.

## Review Notes
The remaining command examples are diagnostically plausible but depend on cluster context, namespace selection, installed tools inside containers, and how Istio access logging is customized. The post intentionally covers common response flags rather than every flag Envoy currently documents.
