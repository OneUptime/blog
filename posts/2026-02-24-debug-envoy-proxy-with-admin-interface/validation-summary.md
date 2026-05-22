# Validation Summary: How to Debug Envoy Proxy with Admin Interface

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Istio
- Envoy Proxy
- Envoy admin interface
- Kubernetes
- kubectl
- istioctl
- jq

## Sources Consulted
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Envoy ConfigDump API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump.proto
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Istio application requirements and sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The bootstrap `config_dump` example used `resource=bootstrap`. Envoy documents `resource` for repeated fields and `mask` for non-repeated fields such as bootstrap, so the command was changed to `config_dump?mask=bootstrap`.
- The `/stats?filter=...` example was described as filtering by prefix. Envoy documents this parameter as a regular expression filter, so the comment was changed to "Filter by regex".
- The command for listing current Envoy log levels used `GET /logging`. Envoy documents `/logging` as a POST endpoint, including listing loggers without query parameters, so the command was changed to use `curl -X POST`.

## Review Notes
The remaining admin endpoints, `istioctl proxy-config` examples, response flag explanations, and Istio sidecar admin port details matched the official Envoy and Istio documentation reviewed. Some `config_dump` JSON structures are marked by Envoy as not guaranteed to be stable, so deeply scripted `jq` usage against full dumps should be treated as version-sensitive.
