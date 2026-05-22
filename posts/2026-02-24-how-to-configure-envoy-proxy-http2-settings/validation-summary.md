# Validation Summary: How to Configure Envoy Proxy HTTP/2 Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy Proxy
- HTTP/2
- gRPC
- Kubernetes
- EnvoyFilter
- DestinationRule

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy core protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto.html
- Envoy HTTP connection manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats

## Issues Found
- The post stated that HTTP/2 is always the default service-to-service protocol inside an Istio mesh. Updated the wording to explain that Istio can use HTTP/2 when the protocol is detected as HTTP/2 or HTTP/2 upgrade is enabled.
- The post described the mesh-wide `h2UpgradePolicy` default as usually `UPGRADE`. Removed that assumption and described `DEFAULT` as using the mesh-wide default.
- The post recommended `UPGRADE` unconditionally for gRPC. Updated this to emphasize explicit Kubernetes Service protocol selection with `grpc`, `http2`, or `appProtocol`, and clarified that `UPGRADE` applies to HTTP/1.1-to-HTTP/2 upgrades.
- The post said Envoy's default `max_concurrent_streams` is 2,147,483,647. Updated this to the current Envoy default of 1,024 and noted Istio's DestinationRule default for `maxConcurrentStreams`.
- The post said per-connection max concurrent streams required an EnvoyFilter. Updated the DestinationRule example and text to use the official `maxConcurrentStreams` field, while keeping the EnvoyFilter example for lower-level HTTP/2 settings.
- EnvoyFilter snippets used camelCase field names for raw Envoy config. Updated them to Envoy's documented snake_case fields such as `typed_extension_protocol_options`, `explicit_http_config`, `http2_protocol_options`, and `typed_config`.
- The post said Envoy's HTTP/2 stream window default is 65,535 bytes. Updated the explanation to distinguish the HTTP/2 spec initial window from current Envoy defaults of 16 MiB stream and 24 MiB connection windows.
- The keep-alive section said the configured interval sends PING frames only on idle connections. Updated this to match Envoy's `connection_keepalive.interval`, which sends PING frames at the configured period.
- The metric names used a non-Envoy `envoy_http2_*` prefix. Updated them to the documented downstream and upstream HTTP/2 codec stat forms, including `http2.<metric>` and `cluster.<cluster>.http2.<metric>`.

## Review Notes
The EnvoyFilter examples are inherently tied to Envoy xDS internals and should be rechecked when upgrading Istio or Envoy, as the Istio EnvoyFilter documentation warns that raw Envoy configuration can change across proxy versions.
