# Validation Summary: How to Set Up Circuit Breaking with Envoy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Envoy Proxy
- Envoy circuit breakers
- Envoy outlier detection
- Envoy admin statistics
- Go and hey load testing
- Python HTTP server

## Sources Consulted
- Envoy circuit breaker API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy circuit breaking architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy outlier detection API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy route action priority API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy bootstrap admin API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto.html
- Envoy file access log API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/file/v3/file.proto
- Envoy upstream HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy CLI options reference: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Red Hat Go Toolset documentation for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_developer_tools/1/html/using_go_1.25_toolset/go-toolset
- Go documentation for installing executables with `go install`: https://go.dev/doc/go-get-install-deprecation

## Issues Found
- The testing and monitoring commands queried `http://localhost:8001/stats`, but the sample Envoy bootstrap did not configure an admin listener. Added an `admin` block listening on `127.0.0.1:8001` with a non-deprecated file access logger so the stats commands work as written.
- The connection pool example used direct cluster fields `common_http_protocol_options` and `http_protocol_options`, which Envoy documents as deprecated for cluster protocol configuration. Replaced them with `typed_extension_protocol_options` using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- The RHEL package command installed `golang`, but Red Hat's RHEL 9 Go Toolset documentation instructs installing `go-toolset`. Updated the command to `sudo dnf install -y go-toolset`.

## Review Notes
The circuit breaker thresholds, route priority field, outlier detection fields, Envoy CLI flags, Python HTTP server command, `go install ...@latest` command, and cited Envoy stats names are consistent with current official documentation. Envoy was not installed in the local environment, so I could not run `envoy --mode validate` against the full configuration.
