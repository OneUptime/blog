# Validation Summary: How to Configure Envoy Proxy Buffer Sizes in Istio

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Istio
- Envoy Proxy
- Kubernetes
- EnvoyFilter resources
- HTTP/2 flow control
- Envoy sidecar resource annotations
- istioctl and kubectl commands

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Envoy listener API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener.proto
- Envoy HTTP buffer filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/buffer/v3/buffer.proto
- Envoy HTTP/2 protocol options reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- Envoy upstream HTTP protocol options reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy 413 debugging FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/debugging/why_is_envoy_sending_413s
- Envoy HTTP connection manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats

## Issues Found
- The post described Envoy as buffering the full request before forwarding by default. Updated the wording to distinguish Envoy's default streaming behavior from explicit buffering.
- The post said fault injection and request mirroring require buffering. Replaced this with examples that actually require or can be configured for request-body buffering, such as the buffer filter and external authorization request-body checks.
- The post stated that the HTTP/2 initial stream window defaults to 64 KiB. Updated this to distinguish the HTTP/2 protocol default of 65,535 bytes from current Envoy defaults of 16 MiB for the stream window and 24 MiB for the connection window when unset.
- Several EnvoyFilter examples used camelCase fields such as `typedConfig`, `maxRequestBytes`, `perConnectionBufferLimitBytes`, and `initialStreamWindowSize`. Updated them to the canonical Envoy protobuf JSON field names used in Istio EnvoyFilter examples, such as `typed_config`, `max_request_bytes`, `per_connection_buffer_limit_bytes`, and `initial_stream_window_size`.
- The HTTP Connection Manager section implied that `streamIdleTimeout` was a body buffer setting. Renamed and clarified the section so it describes request handling settings, not full request-body buffering.
- The monitoring section listed Prometheus-style or incorrect stat names while the command queried Envoy's `/stats` endpoint directly. Replaced them with Envoy `/stats` names for oversized buffered requests and buffered downstream bytes.
- The troubleshooting section referenced outdated camelCase field names. Updated it to match the corrected EnvoyFilter examples.

## Review Notes
EnvoyFilter patches are tightly coupled to Envoy and Istio generated xDS internals, so these examples should be rechecked during Istio and Envoy upgrades. The relative `INSERT_BEFORE` operation is valid, but Istio documents that relative EnvoyFilter operations can be fragile across proxy version changes.
