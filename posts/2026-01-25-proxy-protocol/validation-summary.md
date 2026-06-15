# Validation Summary: How to Configure Proxy Protocol

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Proxy Protocol v1 and v2
- HAProxy
- NGINX HTTP and Stream modules
- AWS Network Load Balancer target groups
- Python socket programming
- Go with github.com/pires/go-proxyproto
- netcat and curl testing

## Sources Consulted
- HAProxy PROXY protocol configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/
- PROXY protocol specification: https://www.haproxy.org/download/1.8/doc/proxy-protocol.txt
- NGINX PROXY Protocol admin guide: https://docs.nginx.com/nginx/admin-guide/load-balancer/using-proxy-protocol/
- NGINX HTTP Real-IP module documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- NGINX HTTP Geo module documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- NGINX Stream Proxy module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- AWS Network Load Balancer target group attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- github.com/pires/go-proxyproto package documentation: https://pkg.go.dev/github.com/pires/go-proxyproto

## Issues Found
- The Proxy Protocol v2 description said it has a fixed-size header. Changed this to say it has a fixed 16-byte header prefix with a length field, because v2 can include variable-length address and TLV data.
- The Python v2 parser computed the command but did not handle LOCAL commands. Updated it to ignore address information for LOCAL commands, as required by the protocol.
- The Python v1 parser did not handle the valid `PROXY UNKNOWN` form. Added handling for this header form.
- The Python v2 parser could attempt to unpack malformed IPv4 or IPv6 address data without checking that the advertised payload was long enough. Added minimum length checks before unpacking.
- The Go example used the deprecated `Policy` field and `PolicyFunc` API from `github.com/pires/go-proxyproto`. Updated it to use the current `ConnPolicy` API with `ConnMustStrictWhiteListPolicy`.
- The NGINX security example used `geo` against the default `$remote_addr`, which can represent the client address after `real_ip_header proxy_protocol` is applied. Updated it to classify `$realip_remote_addr` so the trust check is based on the original connecting proxy address.

## Review Notes
- AWS NLB Proxy Protocol v2 configuration is accurate for the documented `proxy_protocol_v2.enabled` target group attribute. Operators should remember that AWS also adds Proxy Protocol headers to health check connections when this target group attribute is enabled.
- NGINX receiving Proxy Protocol v2 requires versions that support it, and Real-IP module availability depends on how NGINX was built.
