# Validation Summary: How to Configure Global Rate Limiting with Envoy in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy HTTP rate limit filter
- EnvoyFilter
- Envoy rate limit service
- Kubernetes Deployments, Services, and ConfigMaps
- Redis
- kubectl

## Sources Consulted
- Istio task documentation, "Enabling Rate Limits using Envoy": https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio EnvoyFilter API reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio sample rate limit service manifest: https://raw.githubusercontent.com/istio/istio/master/samples/ratelimit/rate-limit-service.yaml
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy rate limit filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy route rate limit action API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy upstream HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy rate limit service README: https://github.com/envoyproxy/ratelimit

## Issues Found
- The rate limit service image used `envoyproxy/ratelimit:master`, but the Envoy rate limit service documents commit-SHA based Docker tags and the current Istio sample pins `envoyproxy/ratelimit:30a4ce1a`. Changed the image tag and added the explicit `/bin/ratelimit` command used by the Istio sample.
- The rate limit service deployment omitted `RUNTIME_IGNOREDOTFILES`, which the Istio sample sets to avoid loading dotfiles from the mounted config directory. Added `RUNTIME_IGNOREDOTFILES: "true"`.
- The manually added Envoy cluster used deprecated direct cluster fields `protocol_selection` and `http2_protocol_options`. Replaced them with `typed_extension_protocol_options` using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions` and explicit HTTP/2 upstream configuration.
- The path descriptor catch-all wording did not mention that an Envoy rate limit service descriptor with a key and no configured value creates a separate counter for each supplied value. Clarified that unmatched paths each get their own counter.
- The Envoy stats command used `curl` directly inside the ingress gateway pod. Istio documents `pilot-agent request GET stats` from the `istio-proxy` container for Envoy stats access, so the command was updated accordingly.

## Review Notes
The post uses EnvoyFilter, which Istio documents as exposing Envoy implementation details that should be monitored carefully during Istio proxy upgrades. Local validation parsed all YAML snippets successfully, but no live Kubernetes or Istio cluster was available in this workspace for an end-to-end apply test.
