# Validation Summary: How to Set Up Envoy with IPv4 and IPv6 Dual-Stack Listeners

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- YAML configuration
- IPv4
- IPv6
- Linux socket behavior
- `curl`
- `ss`

## Sources Consulted
- Envoy v3 API reference: `config.core.v3.SocketAddress` (`ipv4_compat`) https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/address.proto.html
- Envoy v3 API reference: `HttpConnectionManager` (`use_remote_address`) https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy HTTP header and XFF behavior docs https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy architecture terminology (downstream, upstream, listener, cluster) https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/intro/terminology
- Linux `ipv6(7)` man page (`IPV6_V6ONLY`, IPv4-mapped IPv6 behavior) https://man7.org/linux/man-pages/man7/ipv6.7.html
- `ss(8)` man page https://man7.org/linux/man-pages/man8/ss.8.html
- `curl` man page (`-4` / `-6`) https://curl.se/docs/manpage.html
- Local CLI help output: `ss --help`
- Local CLI help output: `curl --help all`

## Issues Found
- The introduction implied that binding to `::` alone was enough for dual-stack acceptance. I changed it to explicitly require `ipv4_compat: true`, matching Envoy's `SocketAddress` documentation.
- The comment on `use_remote_address: true` incorrectly said it "correctly extract[s] IPv4 from mapped address". I changed it to the documented behavior: use the directly connected client address instead of trusting `X-Forwarded-For`.
- The `ss` verification comment overstated what `ss -tlnp | grep envoy` proves. For a single IPv6 listener with `ipv4_compat: true`, Linux may show only the IPv6 socket even though it still accepts IPv4. I updated the verification text and command to reflect that accurately.
- The final takeaway described Envoy's behavior as "protocol translation" between listener and cluster. I changed that wording to the more accurate proxy model: Envoy accepts the downstream connection and opens a separate upstream connection, which can still be IPv4-only.

## Review Notes
- No deprecated Envoy APIs or fields were found in the snippets reviewed; the post uses current v3 API names.
- `envoy` was not installed in the workspace, so this review was validated against official documentation and local CLI help output rather than `envoy --mode validate`.
