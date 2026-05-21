# Validation Summary: How to Configure Rate Limiting at Istio Ingress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio EnvoyFilter
- Envoy HTTP local rate limit filter
- Envoy HTTP global rate limit filter
- Envoy ratelimit service
- Kubernetes Deployments, Services, and ConfigMaps
- Redis
- kubectl and istioctl

## Sources Consulted
- Istio: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio: Envoy Statistics - https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy: HTTP local rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy: HTTP rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy: HTTP route rate limit actions API - https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy ratelimit reference implementation - https://github.com/envoyproxy/ratelimit
- Istio ratelimit sample manifest - https://raw.githubusercontent.com/istio/istio/master/samples/ratelimit/rate-limit-service.yaml

## Issues Found
- The rate limit service Deployment used `envoyproxy/ratelimit:latest`. The official Envoy ratelimit project documents that images are tagged by commit SHA, and the Istio sample pins a commit-tagged image. Updated the example to use `envoyproxy/ratelimit:30a4ce1a`.
- The rate limit service Deployment did not explicitly start `/bin/ratelimit` or set the runtime options used by Istio's ConfigMap-based sample. Added the command plus `RUNTIME_WATCH_ROOT=false` and `RUNTIME_IGNOREDOTFILES=true` so mounted ConfigMap files are loaded reliably.
- The monitoring command used `curl` inside the gateway container and listed incorrect global rate limit metric names. Updated the command to use Istio's documented `pilot-agent request GET stats` pattern and corrected the metric examples to Envoy's HTTP rate limit stat namespaces.

## Review Notes
The EnvoyFilter examples expose Envoy internals, which Istio warns can change across proxy versions. The snippets are otherwise aligned with current Istio and Envoy documentation, but production users should test EnvoyFilters during Istio upgrades and pin the ratelimit image to a reviewed release or commit.
