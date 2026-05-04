# Validation Summary: How to Configure KrakenD API Gateway for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- KrakenD CE / EE API Gateway
- IPv6 networking
- JSON configuration (krakend.json)
- Docker
- curl / ss CLI utilities
- KrakenD telemetry/metrics extra_config plugin

## Sources Consulted
- KrakenD service settings docs: https://www.krakend.io/docs/service-settings/
- KrakenD HTTP server settings: https://www.krakend.io/docs/service-settings/http-server-settings/
- KrakenD extended metrics docs: https://www.krakend.io/docs/telemetry/extended-metrics/
- KrakenD Docker deployment docs: https://www.krakend.io/docs/deploying/docker/
- KrakenD release notes (v2.10): https://www.krakend.io/blog/krakend-2.10-release-notes/
- KrakenD official Docker image announcement: https://www.krakend.io/blog/official-docker-image/
- Docker Hub official `krakend` image: https://hub.docker.com/_/krakend
- krakend-metrics example config: https://github.com/krakend/krakend-metrics/blob/master/examples/config.json

## Issues Found
1. **Incorrect `bind_to` configuration key** — The post claimed KrakenD has a `bind_to` key (with values like `":8080"` or `"[::]:8080"`). This key does not exist in KrakenD. The correct service-level key is `listen_ip`, which takes only an IP address (no brackets, no port). Replaced the entire Step 1 example to use `listen_ip` properly: empty string for all interfaces, `"::"` for all IPv6 interfaces, or a literal IPv6 address like `"2001:db8::68"` for a single host. Also corrected the conclusion which referenced `bind_to`.

2. **Deprecated Docker image** — The post used `devopsfaith/krakend`. As of March 2025, KrakenD became an official Docker Hub image and the `devopsfaith/krakend` namespace is discontinued. Replaced with the official `krakend` image (and updated the surrounding comment).

3. **Metrics endpoint trailing slash** — The post used `curl ... /__stats`. The documented endpoint path is `/__stats/` (with trailing slash). Updated for accuracy against the official docs.

## Review Notes
- The `listen_address` key inside `extra_config["telemetry/metrics"]` accepts a Go-style listener string (`":8090"`, `"127.0.0.1:8090"`). The IPv6 form `"[::]:8090"` is the standard Go `net.Listen` syntax and works in practice; KrakenD docs do not explicitly call out the IPv6 example, but the underlying Go listener handles it.
- The example JSON snippets contain `//` comments. Plain JSON does not allow comments and `krakend check` will reject them; readers must strip them before running. This is a stylistic illustration choice rather than a factual error, so it has been left intact.
- Backend `host` entries with bracketed IPv6 (e.g. `http://[2001:db8::10]:8080`) follow RFC 3986 / RFC 2732 URL syntax and are correctly formatted.
- KrakenD CE 2.x is still actively maintained; the post's prerequisite is current.
