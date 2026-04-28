# Validation Summary: How to Configure Nginx to Proxy DNS Traffic Over IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (stream module: ngx_stream_core_module, ngx_stream_proxy_module, ngx_stream_geo_module, ngx_stream_map_module, ngx_stream_log_module, ngx_stream_upstream_module)
- DNS (UDP and TCP on port 53)
- IPv4 networking
- Linux package management (apt-get / nginx-full)
- BIND `dig` and `nslookup` DNS query tools
- systemd (`systemctl restart nginx`)

## Sources Consulted
- Nginx ngx_stream_core_module documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx ngx_stream_proxy_module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html (verifies `proxy_pass`, `proxy_timeout`, `proxy_responses`, UDP support added in 1.9.13, variable-based `proxy_pass` since 1.11.3)
- Nginx ngx_stream_geo_module documentation: https://nginx.org/en/docs/stream/ngx_stream_geo_module.html (added in 1.11.3)
- Nginx ngx_stream_map_module documentation: https://nginx.org/en/docs/stream/ngx_stream_map_module.html (added in 1.11.2)
- Nginx ngx_stream_log_module documentation: https://nginx.org/en/docs/stream/ngx_stream_log_module.html (verifies `$status`, `$bytes_sent`, `$upstream_addr`, `$upstream_bytes_sent`)
- Nginx ngx_stream_upstream_module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html (verifies `hash $remote_addr consistent`)
- Debian Nginx wiki packaging info: https://wiki.debian.org/Nginx (verifies stream module included in `nginx-full`)
- BIND `dig(1)` man page (verifies `+tcp` is a valid alias for `+vc`)

## Issues Found
- **Prerequisites — fictional configure flag.** The original text claimed Nginx must be compiled with `--with-stream` *and* `--with-stream_udp` modules. The `--with-stream_udp` flag does not exist — UDP support has been built into the stream module itself since Nginx 1.9.13 when `--with-stream` is enabled. Edited the prerequisites paragraph to remove the bogus flag and note that UDP is included in `--with-stream` since 1.9.13.

## Review Notes
- The "DNS Proxy with Access Control" example defines `geo $allowed_dns_client` but never references it in the server block. The inline comment correctly explains that the stream module does not support `if`, and that filtering must be done via `map` + `proxy_pass`. The example is intentionally illustrative rather than enforcing — readers should pair the geo block with a map that selects between an upstream and an empty value to actually deny clients. Left as-is since the author's note acknowledges the limitation.
- The first "Basic" example listens on UDP port 53 with `reuseport` and on TCP port 53 in a separate server block — both correct per Nginx documentation. Note that `reuseport` is only meaningful for UDP and TCP listeners when nginx has multiple worker processes; with a single worker it is a no-op.
- Stream-context features used in the post require relatively recent Nginx versions: UDP listening (1.9.13), variable-based `proxy_pass` (1.11.3), `map` in stream (1.11.2), `geo` in stream (1.11.3). Any modern distro package (Ubuntu 18.04+ ships ≥1.14) easily satisfies these.
- Binding to UDP/53 typically requires running as root or granting the `CAP_NET_BIND_SERVICE` capability; the post does not mention this, but it is implied by the `sudo systemctl restart nginx` invocation.
