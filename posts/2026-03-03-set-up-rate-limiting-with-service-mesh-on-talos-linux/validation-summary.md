# Validation Summary: How to Set Up Rate Limiting with Service Mesh on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes
- Istio
- Envoy
- EnvoyFilter
- Envoy global and local rate limiting
- envoyproxy/ratelimit
- Redis
- kubectl

## Sources Consulted
- Istio official documentation: Enabling Rate Limits using Envoy, https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy official documentation: HTTP local rate limit filter, https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy official documentation: HTTP rate limit filter, https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoyproxy ratelimit official repository documentation, https://github.com/envoyproxy/ratelimit
- Istio official sample manifests for httpbin, sleep, and ratelimit, https://github.com/istio/istio/tree/release-1.29/samples
- Kubernetes official documentation: Services, https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes official documentation: DNS for Services and Pods, https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Talos Linux official documentation, https://www.talos.dev/

## Issues Found
- The sample `httpbin` service was deployed from the old Istio `release-1.20` branch. Updated the sample URLs to the current `release-1.29` branch used by the consulted Istio documentation.
- The post assumed the default namespace would have Istio sidecar injection enabled. Added the namespace label command so the `httpbin` workload receives an Envoy sidecar.
- The test commands called `httpbin.default.svc.cluster.local/get` from the local shell. Kubernetes service DNS resolves inside the cluster, and the official Istio `httpbin` service exposes port `8000`, so the commands would fail as written. Added the Istio `sleep` sample and changed tests to run `curl` from that pod against `httpbin.default.svc.cluster.local:8000/get`.
- The global rate limit EnvoyFilter inserted the `envoy.filters.http.ratelimit` filter but did not add route-level rate limit actions. Envoy only calls the external rate limit service when a route or virtual host has rate limit configuration. Added an `HTTP_ROUTE` patch for the `inbound|http|8000` virtual host with `remote_address`, `:path`, and `x-user-id` actions matching the posted ratelimit descriptors.
- The global rate limit filter insertion did not explicitly match the router sub-filter. Added the `envoy.filters.http.router` sub-filter match, consistent with Istio's global rate limit example.
- The rate limit service deployment used `envoyproxy/ratelimit:latest` and omitted several settings shown in the official Istio sample. Pinned the image to the official sample tag and added the command and runtime environment variables used by Istio's sample deployment.
- The API-key descriptor example nested the premium key under a generic `api_key` descriptor. A normal single-entry `api_key` descriptor would not match that nested rule as described. Changed the premium and default API-key limits to separate top-level descriptors.

## Review Notes
The post is now technically valid for the Istio sample application flow described. EnvoyFilter remains an advanced Istio API that exposes Envoy internals and may need review during Istio upgrades, as noted in the official Istio documentation.
