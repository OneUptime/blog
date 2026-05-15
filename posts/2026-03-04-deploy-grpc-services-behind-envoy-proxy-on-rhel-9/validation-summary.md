# Validation Summary: How to Deploy gRPC Services Behind Envoy Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Envoy Proxy
- gRPC
- HTTP/2
- Go
- Protocol Buffers
- grpcurl
- TLS and ALPN

## Sources Consulted
- Envoy gRPC architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_protocols/grpc.html
- Envoy HTTP connection manager API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy upstream HTTP protocol options API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy health checking overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking
- Envoy gRPC statistics filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/grpc_stats_filter
- Envoy admin interface: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/admin.html
- Envoy load balancing overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancing
- gRPC Go quick start: https://grpc.io/docs/languages/go/quickstart/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- Protocol Buffers Go generated code guide: https://protobuf.dev/reference/go/go-generated/
- grpcurl README: https://github.com/fullstorydev/grpcurl

## Issues Found
- The setup installed Go protobuf plugins but did not install `protoc` or add the plugin directory to `PATH`. Updated the RHEL install command to include `protobuf-compiler` and added the documented `PATH` export.
- The `go_package` option used `./greeter`, while `main.go` imported `example/greeter`. Updated `go_package` to `example/greeter` and added the `go mod init`, `protoc`, and `go mod tidy` commands needed to generate matching Go code.
- The `grpcurl` command depended on server reflection or explicit proto descriptors, but the sample server did not register reflection. Added the official gRPC reflection import and registration so the documented command can discover the service.
- The monitoring command queried Envoy admin stats on port `8001`, but the Envoy configuration did not enable the admin interface. Added a localhost admin listener on port `8001`.
- The post named `grpc.greeter.Greeter.SayHello.total` as a key metric without configuring Envoy's gRPC statistics filter and without the correct cluster stats namespace. Added `envoy.filters.http.grpc_stats` with `stats_for_all_methods: true` and corrected the metric name to `cluster.greeter_service.grpc.greeter.Greeter.SayHello.total`.
- The load-balancing explanation implied `LEAST_REQUEST` is needed for request-level balancing. Updated the wording to reflect that `LEAST_REQUEST` chooses hosts based on fewer active requests.
- The per-method route used a prefix match for a single method. Changed it to an exact `path` match to avoid accidentally matching method names with the same prefix.

## Review Notes
The Envoy configuration uses current v3 typed configuration fields and explicitly enables HTTP/2 for the upstream cluster through `typed_extension_protocol_options`, which is the current documented approach. The TLS listener correctly advertises `h2` through ALPN for gRPC over TLS.
