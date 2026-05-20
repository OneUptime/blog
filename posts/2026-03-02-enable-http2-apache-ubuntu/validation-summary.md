# Validation Summary: How to Enable HTTP/2 in Apache on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- Apache `mod_http2`
- Apache MPMs: Event, Worker, Prefork
- TLS / ALPN
- PHP-FPM
- curl
- OpenSSL
- nghttp2 client

## Sources Consulted
- Apache HTTP Server HTTP/2 guide: https://httpd.apache.org/docs/current/howto/http2.html
- Apache `mod_http2` module documentation: https://httpd.apache.org/docs/current/mod/mod_http2.html
- nghttp2 `nghttp(1)` documentation: https://nghttp2.org/documentation/nghttp.1.html
- Chrome for Developers, HTTP/2 Server Push removal: https://developer.chrome.com/blog/removing-push
- MDN HTTP/2 glossary: https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2
- Red Hat Customer Portal note on HTTP/2 and Prefork MPM error text: https://access.redhat.com/solutions/3952981

## Issues Found
- The HTTP/2 Server Push example used the Apache `Header` directive without enabling `mod_headers`. Added `sudo a2enmod headers` and a reload command before the example so the snippet works on a default Apache installation.
- The note about Server Push understated current browser behavior. Updated it to say major browsers have removed or disabled HTTP/2 Server Push, so `Link: rel=preload` headers usually act as preload hints rather than causing pushed responses.
- The `H2WindowSize` tuning comment incorrectly implied response throughput tuning for large transfers. Updated it to describe request body flow control, matching Apache `mod_http2` documentation.
- The `H2StreamMaxMemSize` tuning comment incorrectly described an initial window size. Updated it to describe the per-stream response data buffer controlled by the directive.
- The Prefork troubleshooting error used an inaccurate Apache log code/message. Updated it to `AH10034: The mpm module (prefork.c) is not supported by mod_http2`, which matches observed Apache/httpd packaging documentation.

## Review Notes
Apache upstream documentation currently describes Prefork MPM as having severe HTTP/2 restrictions, while distribution packaging and logs commonly report Prefork as unsupported by `mod_http2`. The post's recommendation to use Event MPM and PHP-FPM remains technically appropriate for Ubuntu deployments.
