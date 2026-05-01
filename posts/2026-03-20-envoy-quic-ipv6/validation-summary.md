# Validation Summary: How to Configure Envoy with QUIC and IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- QUIC
- HTTP/3
- IPv6
- curl
- TLS

## Sources Consulted
- Envoy installation docs: https://www.envoyproxy.io/docs/envoy/latest/start/install
- Envoy HTTP/3 overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http3.html
- Envoy UDP listener config proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/udp_listener_config.proto.html
- Envoy QUIC transport socket proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/quic/v3/quic_transport.proto
- Envoy network address proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto.html
- Envoy cluster proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy HTTP route components proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- curl man page: https://curl.se/docs/manpage.html
- curl tutorial: https://curl.se/docs/tutorial.html
- Envoy version history: https://www.envoyproxy.io/docs/envoy/latest/version_history/version_history

## Issues Found
- The install block used the older GetEnvoy repository and package name (`deb.dl.getenvoy.io` and `getenvoy-envoy`). I replaced it with the current official `apt.envoyproxy.io` repository flow and the `envoy` package so the commands match current Envoy documentation.
- The prerequisites said `Envoy 1.20+`, which points at an archived release line by 2026. I changed this to require a current Envoy release with downstream HTTP/3 support.
- The diagram and the `TCP/HTTP2 fallback listener` label implied protocol behavior that the configuration did not actually set up. The cluster does not enable upstream HTTP/2, and the TCP fallback listener negotiates both `h2` and `http/1.1`, so I corrected those labels to match the config.
- The sample backend address `2001:db8:backend::1` was not a valid IPv6 literal. I replaced it with `2001:db8::10`.
- The HTTP/3 verification command used `--http3` with an IPv6 literal URL. That can fall back to older HTTP versions and would not match the example `example.com` certificate. I changed it to `--http3-only` with `--resolve example.com:443:[2001:db8::1] https://example.com/`, and I added `-g` to the IPv6 admin `curl` examples.

## Review Notes
- The cluster example still proxies upstream over HTTP/1.1. If the article later intends to demonstrate HTTP/2 upstream, the cluster will need explicit upstream HTTP protocol configuration.
- The apt example assumes `$(lsb_release -cs)` resolves to a Debian or Ubuntu codename supported by `apt.envoyproxy.io`.
- Envoy’s HTTP/3 overview notes that downstream HTTP/3 is production-ready, but improvements are still ongoing and hot restart is not gracefully handled yet.
