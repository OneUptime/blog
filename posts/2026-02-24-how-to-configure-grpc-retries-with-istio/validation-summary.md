# Validation Summary: How to Configure gRPC Retries with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Envoy retries and circuit breaking
- gRPC status codes
- Kubernetes

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy router filter retry headers: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy route RetryPolicy reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- gRPC status code guide: https://grpc.io/docs/guides/status-codes/
- gRPC retry guide: https://grpc.io/docs/guides/retry/

## Issues Found
- The backoff section said the base interval could be configured, but the YAML snippet did not include the Istio `backoff` field. Added `backoff: 100ms` and clarified that it sets the minimum interval between retry attempts.
- The timeout explanation treated `attempts: 3` as three total attempts. Istio documents `attempts` as the number of retries, with a maximum of `1 + attempts` requests. Updated the explanation from ~6 seconds to ~8 seconds for a 2s per-try timeout with 3 retries.
- The per-method gRPC matching example matched the HTTP/2 pseudo-header `:path` under `headers`. Istio `HTTPMatchRequest` provides `uri` for path matching, and header keys have restrictions. Changed the examples to use `uri.prefix`.
- The default Istio retry policy was listed as `connect-failure` and `refused-stream` only. Istio's current default also includes `unavailable` and `cancelled`. Updated the text.
- The DestinationRule `maxRetries` explanation called it a retry budget. Istio documents this field as the maximum number of outstanding retries to all hosts in a cluster at a given time. Updated the wording and the related Envoy stats description.
- The YAML examples used `networking.istio.io/v1beta1`. Istio still supports `v1beta1`, but the networking APIs were promoted to `networking.istio.io/v1` in Istio 1.22 and current official examples use `v1`. Updated the examples to the stable API version.

## Review Notes
- The remaining YAML examples use current Istio networking API fields and valid duration formats.
- The `h2UpgradePolicy: UPGRADE` field is valid, though it is most relevant when upgrading HTTP/1.1 upstream connections; gRPC traffic is already HTTP/2.
