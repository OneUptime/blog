# Validation Summary: How to Set Up Envoy Proxy as a Sidecar for Advanced Traffic Management on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes Deployments and ConfigMaps
- Envoy Proxy sidecar configuration
- Envoy HTTP routing, retries, circuit breakers, health checks, outlier detection, and local rate limiting
- Envoy admin interface and Prometheus metrics
- GKE Managed Service for Prometheus / Cloud Monitoring
- kubectl

## Sources Consulted
- Envoy version history: https://www.envoyproxy.io/docs/envoy/latest/version_history/current
- Envoy route retry policy API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy local rate limit filter API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto
- Envoy circuit breaker API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy cluster API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy administration interface: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- GKE Managed Service for Prometheus managed collection: https://cloud.google.com/stackdriver/docs/managed-prometheus/setup-managed
- GKE Managed Service for Prometheus troubleshooting: https://cloud.google.com/stackdriver/docs/managed-prometheus/troubleshooting

## Issues Found
- The application container example pointed outbound traffic at `localhost:9901`, which is Envoy's admin port, not the outbound listener. Changed the environment variables to point at `localhost:10001`.
- The Deployment exposed Envoy's admin and ingress ports but omitted the outbound listener port. Added the `envoy-egress` container port on `10001`.
- The Envoy image used `envoyproxy/envoy:v1.28-latest`, which is an archived Envoy release line. Updated it to `envoyproxy/envoy:v1.38-latest`, verified the image exists, and validated the embedded Envoy configuration with Envoy 1.38.0.
- The Envoy admin interface was bound to `0.0.0.0` without path restrictions. Added `allow_paths` for `/ready` and `/stats` to reduce exposure while preserving the Prometheus scrape path.
- The outbound listener routes depend on HTTP `Host` or HTTP/2 `:authority` matching the configured virtual host domains. Added a note explaining that clients must connect to `localhost:10001` while preserving the upstream authority value.
- The inbound sidecar listener only receives Kubernetes Service traffic if the Service targets the Envoy ingress port. Added a note clarifying that the Service should target `envoy-ingress` when inbound requests should pass through Envoy.
- The observability section described exporting metrics via OpenTelemetry or Prometheus but showed a StatsD sink that referenced an undefined `statsd_cluster`. Replaced this with a narrower Prometheus/GKE Managed Service for Prometheus explanation and kept the valid `stats_config` example.

## Review Notes
- The main Envoy configuration embedded in the ConfigMap was validated successfully with `docker run --rm -v /tmp/blog-envoy.yaml:/etc/envoy/envoy.yaml:ro envoyproxy/envoy:v1.38-latest --mode validate -c /etc/envoy/envoy.yaml`.
- Ruby was not installed in the environment, so a Ruby-based YAML parse sweep could not be run. The primary Envoy configuration was validated with the official Envoy binary instead.
