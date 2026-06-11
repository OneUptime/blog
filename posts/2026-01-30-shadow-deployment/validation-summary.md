# Validation Summary: How to Create Shadow Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio (VirtualService, DestinationRule, traffic mirroring with `mirror` and `mirrorPercentage`)
- NGINX (`ngx_http_mirror_module`, `mirror` and `mirror_request_body` directives)
- Envoy (HTTP connection manager v3, `request_mirror_policies`, `runtime_fraction`)
- Kubernetes (Deployment, Service, ResourceQuota with PriorityClass scope)
- Prometheus (recording rules, alerting rules, `histogram_quantile`)
- Python (`dataclasses`, FastAPI/Starlette middleware, `BaseHTTPMiddleware`)
- Bash + `kubectl` + `promtool` + `jq`

## Sources Consulted
- Istio Virtual Service reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- NGINX `ngx_http_mirror_module`: https://nginx.org/en/docs/http/ngx_http_mirror_module.html
- Envoy `route_components.proto` v3: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Kubernetes ResourceQuota / scopeSelector documentation
- Prometheus recording and alerting rules reference

## Issues Found

1. **Missing `uuid` import in the `OrderService` Python example.** The code under "Option 1: Read-Only Shadow Mode" called `uuid.uuid4()` but only imported `os`. Added `import uuid` so the snippet runs as written.

2. **Misleading "Set Timeouts for Shadow Requests" section.** The original claimed the `timeout: 5s` field on the Istio HTTPRoute "prevents slow shadow responses from consuming resources." This is inaccurate: Istio/Envoy dispatch mirror traffic as fire-and-forget — the mirror response is discarded and never blocks the primary, so the route-level `timeout` only bounds the primary destination. Renamed the section to "Set Timeouts on the Primary Route," rewrote the description to reflect actual mirror semantics, and added a note that bounding the shadow's own resource usage requires limits on the shadow service itself (e.g., `DestinationRule.connectionPool`).

## Review Notes
- The `networking.istio.io/v1beta1` apiVersion is still served and works, but current Istio docs use `networking.istio.io/v1`. Left as-is since the post's configurations remain valid.
- `mirror_request_body on;` in the NGINX example is the module default, so it is redundant but not incorrect — kept for clarity.
- The ResourceQuota example references a `shadow` PriorityClass via `scopeSelector`; this assumes such a PriorityClass has been created out-of-band. Not technically wrong, just contextual.
- The `from typing import Optional` import in `compare_responses.py` is unused but does not affect correctness.
- The promotion script uses `kubectl exec ... promtool query instant` to read Prometheus; querying the Prometheus HTTP API directly would be cleaner, but the approach as written is functional.
