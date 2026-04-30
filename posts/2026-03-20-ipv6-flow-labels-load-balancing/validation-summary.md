# Validation Summary: How to Use Flow Labels for Stateless Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Flow Label
- Linux IPv6 ECMP and sysctl tuning
- HAProxy
- NGINX
- Python 3 standard library (`socket`, `hashlib`, `struct`)

## Sources Consulted
- RFC 6437, IPv6 Flow Label Specification: https://www.rfc-editor.org/rfc/rfc6437
- RFC 6438, Using the IPv6 Flow Label for Equal Cost Multipath Routing and Link Aggregation in Tunnels: https://www.rfc-editor.org/rfc/rfc6438
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- HAProxy Configuration Manual: https://docs.haproxy.org/3.1/configuration.html
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX HTTPS configuration documentation: https://nginx.org/en/docs/http/configuring_https_servers.html
- Python `socket` documentation: https://docs.python.org/3.11/library/socket.html
- Python `struct` documentation: https://docs.python.org/3.11/library/struct.html
- Python `hashlib` documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found
- The introduction overstated the benefit for TLS and QUIC. Their transport ports are still visible, so the text was corrected to focus on IPsec ESP and tunneled or fragmented traffic where transport headers may be unavailable or inconvenient to parse.
- The explanation block incorrectly said Flow Labels “work with all protocols” and that a non-zero Flow Label implies a consistent 5-tuple. It was corrected to reflect RFC 6437: Flow Labels are useful entropy when present, but they must be combined with other fields and do not by themselves imply a 5-tuple.
- The Linux ECMP example used `net.ipv6.flowlabel_state_ranges` as if it enabled flow-label-aware ECMP hashing. That sysctl only splits the Flow Label number space; it does not control ECMP hashing. The example was corrected to use `net.ipv6.fib_multipath_hash_policy` and `net.ipv6.auto_flowlabels`, which are the relevant Linux controls documented by the kernel.
- The HAProxy section claimed IPv6 Flow Label awareness, but standard `balance source` hashes the source IP address, not the IPv6 Flow Label. The section title and comments were corrected to describe source-address persistence instead.
- The NGINX section implied Flow Label usage, but `ip_hash` hashes the client IP address, not the IPv6 Flow Label. The section title and explanatory text were corrected accordingly.
- The NGINX HTTPS example was incomplete because `listen ... ssl` requires certificate directives in a working server block. `ssl_certificate` and `ssl_certificate_key` were added.
- Multiple placeholder IPv6 addresses were invalid because they used non-hexadecimal hextets such as `server`, `backend`, `client`, and `service`. All examples were replaced with valid documentation-prefix IPv6 literals.
- The zero-Flow-Label Python fallback example referenced undefined helper functions. It was rewritten to call the previously defined load balancer directly for non-zero labels and to perform a concrete 5-tuple hash for the zero-label fallback case.

## Review Notes
- Linux's default IPv6 multipath policy already includes source address, destination address, and Flow Label in Layer 3 mode; the Flow Label only adds useful entropy when it is non-zero.
- The Python example was sanity-checked locally after the fixes and produced stable backend selection for repeated lookups of the same flow.
