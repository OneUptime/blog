# Validation Summary: How to Understand QUIC Connection Migration with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- QUIC
- HTTP/3
- IPv6
- IPv6 privacy extensions
- Nginx
- HAProxy
- aioquic
- Python
- Linux networking tools

## Sources Consulted
- RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport - https://datatracker.ietf.org/doc/html/rfc9000
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6 - https://www.rfc-editor.org/rfc/rfc8981
- Nginx `ngx_http_v3_module` documentation - https://nginx.org/en/docs/http/ngx_http_v3_module.html
- HAProxy configuration manual 2.9r1 - https://www.haproxy.com/documentation/haproxy-configuration-manual/2-9r1/
- aioquic asyncio API documentation - https://aioquic.readthedocs.io/en/latest/asyncio.html
- aioquic `QuicConnectionProtocol` API/source docs - https://aioquic.readthedocs.io/en/latest/_modules/aioquic/asyncio/protocol.html
- aioquic QUIC API documentation - https://aioquic.readthedocs.io/en/latest/quic.html
- Linux kernel IP sysctl documentation - https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Python `ssl` module documentation - https://docs.python.org/3/library/ssl.html
- OneUptime monitoring product page - https://oneuptime.com/product/monitoring

## Issues Found
- The post cited IPv6 privacy rotation as RFC 4941. I updated it to RFC 8981 and clarified that RFC 8981 obsoletes RFC 4941.
- The migration explanation and diagrams implied the same connection ID is reused across different client addresses. RFC 9000 Section 9.5 says an endpoint must not reuse a connection ID when sending from more than one local address, so I corrected the diagram and explanation to use a fresh CID on the new path.
- The prose said the client sends `PATH_CHALLENGE` and then migrates. RFC 9000 is more nuanced: endpoints validate a new path with `PATH_CHALLENGE` / `PATH_RESPONSE`, and non-probing packets on the new path indicate migration. I rewrote the explanation and validation flow to match the RFC.
- The Nginx section incorrectly treated `quic_retry` as the migration-enabling setting. Per Nginx documentation, `quic_retry` controls QUIC address validation, while `quic_bpf` is the documented directive that allows supporting connection migration. I updated the snippet accordingly and used the documented `reuseport` pattern from the Nginx example.
- The HAProxy section incorrectly claimed HAProxy 2.7+ supports QUIC CID-based routing for migration. HAProxy’s own documentation says QUIC provides migration support but HAProxy currently does not support it, so I replaced that section with an accurate limitation note.
- The Python example used unsupported or private `aioquic` internals and the wrong API (`send_ping`, `_network_paths`, `host_cid`, and `verify_mode = False`). I replaced it with a public-API example using `QuicConfiguration(..., verify_mode=ssl.CERT_NONE)`, `client.ping()`, and `client.change_connection_id()`.
- The Nginx logging example used an undocumented `$quic_connection_id` variable. Nginx’s documented HTTP/3 embedded variable is `$http3`, so I corrected the logging example and narrowed the monitoring claim to what Nginx can actually expose.
- The OneUptime section referred to mobile-network vantage points and transition comparison in a way not supported by the product page I checked. I changed it to the documented multi-location latency and availability comparison use case.
- The sample `ip -6 addr show` output was cleaned up to better match normal `iproute2` formatting.

## Review Notes
- Nginx documents `ngx_http_v3_module` as experimental and not built by default.
- Linux intentionally exposes the sysctl name as `temp_prefered_lft`; the spelling is odd but matches the kernel documentation.
- The revised `aioquic` example verifies migration only if the client actually moves to a new IPv6 path during the pause; it no longer claims to synthetically rewrite the local source address from user code.
