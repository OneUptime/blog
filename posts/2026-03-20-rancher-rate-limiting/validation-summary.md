# Validation Summary: How to Configure Rate Limiting with Service Mesh in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Envoy
- Envoy Rate Limit Service
- Redis
- Prometheus

## Sources Consulted
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio sample rate limit service manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/ratelimit/rate-limit-service.yaml
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio querying metrics from Prometheus: https://istio.io/latest/docs/tasks/observability/metrics/querying-metrics/
- Envoy local rate limit filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy rate limit filter docs: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy local rate limit proto: https://raw.githubusercontent.com/envoyproxy/envoy/main/api/envoy/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto
- Envoy rate limit proto: https://raw.githubusercontent.com/envoyproxy/envoy/main/api/envoy/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy ratelimit configuration reference: https://github.com/envoyproxy/ratelimit/blob/main/README.md
- Rancher Istio install/deprecation guidance: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/istio-setup-guide/enable-istio-in-cluster
- Rancher Istio deprecation notice: https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/istio/disable-istio

## Issues Found
- The global rate-limit service manifest was incomplete. It referenced `ratelimit.production.svc.cluster.local:8081` from the Envoy filter but did not create a Kubernetes `Service` for the rate-limit deployment. I added the `Service`, exposed the HTTP/gRPC/debug ports, and aligned the deployment with the official Istio sample so the gRPC rate-limit cluster can resolve correctly.
- The global rate-limit filter inserted `envoy.filters.http.ratelimit` but did not define any rate-limit actions, so Envoy would not generate descriptors to send to the rate-limit service. I added `rate_limits` actions for the default quota, `x-user-id`, and `:path`, and corrected the gRPC authority/transport settings.
- The Envoy ratelimit configuration used uppercase `MINUTE`. The official ratelimit service configuration format documents lowercase units (`second`, `minute`, `hour`, `day`). I changed the units to `minute`.
- The per-IP descriptor in the sidecar inbound example was misleading. Envoy’s `remote_address` rate-limit action depends on `X-Forwarded-For`, which is appropriate at gateways but not reliable for generic sidecar-inbound service traffic. I removed that descriptor from this service-level example.
- The gateway local rate-limit example omitted `filter_enabled` and `filter_enforced`. Envoy’s local rate-limit filter defaults both to 0% if they are not set, so the example would not have enforced any limit. I added both fields and kept the response header behavior consistent with the local example.
- The test and monitoring sections overstated expected local-rate-limit results and used monitoring guidance that was not accurate by default. I clarified that local limits are per Envoy instance, noted that `http_local_rate_limit` stats are disabled by default unless `proxyStatsMatcher` enables them, and replaced the Prometheus query with a standard `istio_requests_total` 429 query.

## Review Notes
- Rancher’s built-in `rancher-istio` distribution is deprecated as of Rancher v2.12.0. The post is still technically useful for Istio managed through Rancher, but a future revision should state which Rancher/Istio distribution path it assumes.
- The manifest still uses the moving tag `envoyproxy/ratelimit:master`. That is functional, but pinning a specific image tag or digest would make the guide more reproducible over time.
