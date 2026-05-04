# Validation Summary: How to Configure HAProxy PROXY Protocol with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- HAProxy (server/bind options: `send-proxy`, `send-proxy-v2`, `send-proxy-v2-ssl`, `accept-proxy`)
- PROXY protocol v1 (text) and v2 (binary)
- IPv6 networking
- Nginx (`proxy_protocol`, `real_ip_header`, `set_real_ip_from`)
- netcat (`nc`) for protocol testing

## Sources Consulted
- HAProxy configuration manual: https://docs.haproxy.org/
- PROXY protocol specification: https://www.haproxy.org/download/2.8/doc/proxy-protocol.txt
- Nginx ngx_http_realip_module documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Nginx listen directive `proxy_protocol` parameter docs

## Issues Found
1. **`send-proxy-v2 ssl` was incorrect.** HAProxy's option for sending PROXY v2 plus SSL info via TLV is the single keyword `send-proxy-v2-ssl` (hyphenated), not two separate tokens. Changed `server app1 [2001:db8::10]:8080 send-proxy-v2 ssl` → `server app1 [2001:db8::10]:8080 send-proxy-v2-ssl`.
2. **Invalid IPv6 literal in test command.** The `nc` example used `2001:db8::test`, which is not a valid IPv6 address (`t`/`s` aren't hex digits) and would be rejected by a PROXY protocol v1 parser. Changed to `2001:db8::1`, a valid documentation-range IPv6 address.

## Review Notes
- The illustrative placeholders `2001:db8::client` and `2001:db8::haproxy` in the explanatory diagrams/format examples are also not strictly valid IPv6 literals, but their context (labelled as conceptual examples next to the format spec, not in runnable commands) makes their intent clear, so they were left in place.
- `nc -l 8080` syntax varies between netcat implementations (BSD/OpenBSD vs GNU/traditional); on some distributions you may need `nc -l -p 8080`. Acceptable for an illustrative test snippet.
- The post correctly states PROXY v2 is binary and preferred, correctly describes the v1 line format and `PROXY UNKNOWN\r\n` short form, and correctly uses `accept-proxy` as the bind option for receiving PROXY protocol.
