# Validation Summary: How to Configure Envoy EDS (Endpoint Discovery) with IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- xDS / EDS
- gRPC control plane configuration
- IPv4 endpoint addressing
- Envoy admin API

## Sources Consulted
- Envoy xDS protocol docs: https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol.html
- Envoy `ConfigSource` and `PathConfigSource` v3 API docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/config_source.proto.html
- Envoy cluster v3 API docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy endpoint v3 API docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint.proto.html
- Envoy locality-weighted load balancing docs: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/locality_weight
- Envoy admin interface docs: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Envoy `ConfigDump` admin API docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump.proto
- Envoy dynamic control plane quick start: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/configuration-dynamic-control-plane
- Envoy upstream HTTP protocol options v3 API docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto

## Issues Found
- The "Static EDS Configuration (load_assignment inline)" section was technically mislabeled. The example used `path_config_source`, which is file-based xDS, not inline `load_assignment`. I corrected the heading and explanatory text so it matches the actual configuration shown.
- The gRPC xDS control plane cluster was missing upstream HTTP/2 configuration. Envoy's gRPC-based xDS communication requires the upstream cluster to speak HTTP/2, so I added `typed_extension_protocol_options` with `HttpProtocolOptions` and `http2_protocol_options: {}`.
- The locality-weighted EDS section implied that EDS weights alone were sufficient and used wording that could be confused with Envoy's separate zone aware routing feature. Envoy also requires `common_lb_config.locality_weighted_lb_config` on the cluster, so I added the missing cluster-side configuration and clarified the explanation.
- The `config_dump` admin command omitted `?include_eds`, which Envoy requires to include EDS configuration in the dump. I updated the command accordingly.

## Review Notes
- The post is technically relevant and salvageable; after the fixes above, the examples align with current Envoy v3 documentation.
- The examples explicitly set `resource_api_version: V3` and `transport_api_version: V3`. Envoy's current docs note that v3 is the only supported version and is the default when omitted, so the explicit settings are acceptable.
