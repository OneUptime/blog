# Validation Summary: Connect, TLS Handshake, Read, Write, Idle, and Total Timeouts: Which One Actually Fired?

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- HTTP and HTTPS request phases
- TCP, TLS, QUIC, and DNS
- curl
- Python Requests and urllib3
- Go `net/http`
- NGINX proxy and upstream modules
- gRPC deadlines
- AWS Application Load Balancer
- Node.js HTTP server keep-alive

## Sources Consulted
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [Python Requests advanced timeout documentation](https://docs.python-requests.org/en/latest/user/advanced/#timeouts)
- [urllib3 timeout reference](https://urllib3.readthedocs.io/en/stable/reference/urllib3.util.html#urllib3.util.Timeout)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [gRPC deadlines guide](https://grpc.io/docs/guides/deadlines/)
- [AWS Application Load Balancer attributes](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html)
- [Node.js HTTP documentation](https://nodejs.org/api/http.html#serverkeepalivetimeout)
- [RFC 9001: Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001)

## Issues Found
- The request timeline placed TLS after both TCP and QUIC connection establishment. QUIC integrates TLS into its transport handshake, so the timeline now distinguishes TCP followed by TLS from QUIC with integrated TLS.
- The connect-timeout table said the typical symptom was the absence of an established socket. That was too narrow because implementations such as curl keep the connection phase active through TLS or QUIC negotiation. It now describes the absence of a usable connection.
- The TLS diagnostic described “ClientHello retransmissions” after TCP connection establishment. For TLS over TCP, TCP retransmits segments carrying the ClientHello; TLS itself does not retransmit the message. The wording now identifies the retransmitted TCP segments.

## Review Notes
- The curl commands and write-out variables were checked successfully with curl 8.7.1. Current curl documentation states that `--max-time` applies to each transfer attempt and resets when `--retry` starts another attempt; `--retry-max-time` is needed to bound the retry period.
- Current Node.js releases add `server.keepAliveTimeoutBuffer` to `server.keepAliveTimeout` when calculating the internal socket timeout. This does not change the post's phase-level explanation that `keepAliveTimeout` governs inactivity after a response while awaiting more request data.
- No deprecated APIs or version-pinned claims were found.
