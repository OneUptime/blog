# Validation Summary: How to Configure UDP Load Balancing in Nginx

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (stream module)
- UDP protocol
- DNS load balancing
- VoIP (SIP/RTP) load balancing
- Game server load balancing
- Linux networking tools (ss, dig, systemctl)
- nginx_status / stub_status module

## Sources Consulted
- Nginx stream proxy module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx stream core module documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- Nginx CHANGES log (version history for stream/UDP support)

## Issues Found

1. **Incorrect version claim for UDP support**: The introduction and prerequisites stated UDP support requires nginx 1.9.0+. In reality, the `stream` module was introduced in 1.9.0 with TCP-only support; UDP support in the stream module (the `udp` parameter on the `listen` directive and UDP proxying) was added in **1.9.13**. Updated the introduction to clarify the distinction and corrected the prerequisites comment to read "1.9.13+".

2. **Incorrect explanation of `proxy_responses 0`**: The Stateful UDP example used `proxy_responses 0;` with the comment "forward all responses until timeout". Per the official nginx documentation, `proxy_responses 0` actually means "no response is expected" — it is intended for fire-and-forget UDP protocols and terminates the session early. To forward all responses until timeout (the desired behavior for game traffic), the directive should be omitted entirely, since the default behavior is "the number of datagrams is not limited". Removed the incorrect `proxy_responses 0;` line and replaced the comment with a clarification of why we omit the directive and what `proxy_responses 0` actually does.

## Review Notes

- The Health Checks section shows the structure but does not include the actual passive health check parameters (`max_fails`, `fail_timeout`). The author appears to have intentionally left these out to keep the example minimal, and the surrounding comments correctly note that these parameters apply to UDP servers in the stream module. Could be improved in the future by including a concrete example like `server 10.20.0.10:53 max_fails=3 fail_timeout=30s;`.
- The `hash $remote_addr:$remote_port consistent;` directive is valid (the hash directive accepts variables and arbitrary text), but in many real-world UDP scenarios using just `$remote_addr` is preferable because clients behind NAT may use ephemeral source ports that change between datagrams in the same logical session. This is a configuration trade-off, not a technical error.
- `proxy_buffer_size 4k` in the SIP example is a reasonable optimization (default is 16k), since SIP messages typically fit well below 1500 bytes (UDP MTU). Note that `proxy_buffer_size` was added to the stream module in 1.9.4.
- `nginx_status` referenced for monitoring is provided by the `ngx_http_stub_status_module`, which only reports HTTP-level metrics — it does not include stream-module statistics. Detailed stream metrics require Nginx Plus or third-party modules. The post does not claim otherwise but readers should be aware.
- The `reuseport` parameter requires Linux kernel 3.9+ (or DragonFly BSD / FreeBSD 12+ with SO_REUSEPORT_LB). Worth keeping in mind for older systems.
