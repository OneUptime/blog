# Validation Summary: How to Configure Rate Limiting with Envoy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Envoy HTTP filters
- Envoy local rate limiting
- Envoy global rate limiting
- Envoy route configuration
- Envoy upstream cluster configuration
- Envoy reference ratelimit service
- Redis
- Podman
- Go

## Sources Consulted
- Envoy HTTP local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy rate limit service documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/rate_limit.html
- Envoy route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy cluster v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy HTTP upstream protocol options v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy reference ratelimit service README: https://github.com/envoyproxy/ratelimit
- func-e package documentation: https://pkg.go.dev/github.com/tetratelabs/func-e

## Issues Found
- The full local rate limit Envoy configuration used the admin stats endpoint later in the article but did not configure Envoy admin. Added an `admin` listener on `127.0.0.1:8001`.
- The local rate limit explanation described a fixed 60-second window. Updated it to describe Envoy's token bucket refill behavior.
- The global rate limiting overview referred to "Lyft's ratelimit"; the maintained reference implementation now lives under `envoyproxy/ratelimit`. Updated the wording.
- The prerequisites omitted Go even though the article builds the reference ratelimit service from source. Added Go to the prerequisites.
- Commands writing under `/etc` and `/usr/local/bin` did not use sudo. Updated the `mkdir` and `go build` commands.
- The ratelimit service runtime path variables did not match the documented `RUNTIME_ROOT`, `RUNTIME_SUBDIRECTORY`, and `RUNTIME_APPDIRECTORY` layout for `/etc/ratelimit/config/config.yaml`. Updated the environment variables.
- The global Envoy route example placed `rate_limits` under `route`, but Envoy defines route rate limits on the route object beside `route`. Moved `rate_limits` to the correct level.
- The route action used `request_headers` on `:path` while the ratelimit configuration matched only the exact value `/api`, so requests such as `/api/test` would not match that descriptor. Replaced it with a `generic_key` descriptor for `/api`.
- The rate limit service cluster used the deprecated top-level `http2_protocol_options`. Replaced it with `typed_extension_protocol_options` using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.
- The listed stats names did not match Envoy's documented namespaces for the HTTP local and global rate limit filters. Updated the metric names.

## Review Notes
The tutorial remains a concise setup guide rather than a complete production deployment. Future improvements could pin exact Envoy and ratelimit service versions and show a systemd unit for the ratelimit service on RHEL.
