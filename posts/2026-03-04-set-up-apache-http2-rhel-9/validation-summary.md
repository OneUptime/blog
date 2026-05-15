# Validation Summary: How to Set Up Apache with HTTP/2 on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4
- mod_http2
- mod_ssl and TLS
- HTTP/2, ALPN, h2, and h2c
- curl, OpenSSL, and nghttp2 client tools

## Sources Consulted
- Apache HTTP Server 2.4 HTTP/2 guide: https://httpd.apache.org/docs/2.4/en/howto/http2.html
- Apache HTTP Server 2.4 mod_http2 reference: https://httpd.apache.org/docs/2.4/en/mod/mod_http2.html
- Apache HTTP Server 2.4 MPM documentation: https://httpd.apache.org/docs/current/en/mpm.html
- Red Hat Enterprise Linux 9 Deploying web servers and reverse proxies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat Enterprise Linux 9 TLS guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- RFC 9113, HTTP/2: https://www.rfc-editor.org/rfc/rfc9113.html
- Chrome for Developers, Remove HTTP/2 Server Push from Chrome: https://developer.chrome.com/blog/removing-push
- Local curl and OpenSSL command help output for `--http2`, `-connect`, and `-alpn` options

## Issues Found
- The post described server push as a general HTTP/2 benefit without noting current browser support limitations. Updated the wording to call server push optional and limited to clients that still support it.
- The `H2WindowSize` tuning comment said larger values can improve throughput for large files. Apache documents this directive as client-to-server request body flow control, not response body transfer, so the comment now refers to large uploads.
- The `H2Direct` tuning comment said it improves performance by avoiding an internal redirect. Apache documents it as direct HTTP/2 mode, mainly relevant to h2c/prior-knowledge preamble handling, so the comment was corrected.

## Review Notes
- The main setup flow is technically sound for RHEL 9: install/load `mod_http2`, use a threaded MPM such as event, enable `Protocols h2 http/1.1` for TLS virtual hosts, and verify with curl or an HTTP/2 client.
- Enabling `h2c` globally is valid Apache syntax, but many public browser deployments only need `h2` on TLS virtual hosts.
- `H2Push` is enabled by default in Apache, but HTTP/2 server push is no longer useful for most browser traffic. Future revisions could prefer preload headers or 103 Early Hints guidance.
