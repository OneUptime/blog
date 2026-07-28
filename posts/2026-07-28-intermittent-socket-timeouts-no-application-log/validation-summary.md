# Validation Summary: How to Debug Intermittent Socket Timeouts When Application Logs Show No Request

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- TCP sockets and Linux socket APIs
- curl and libcurl
- Python Requests
- Go `net/http/httptrace`
- DNS, IPv4, IPv6, and Happy Eyeballs
- AWS Application Load Balancer access logs
- Kubernetes Services, Pods, and EndpointSlices
- tcpdump and packet capture
- TLS and HTTP
- NAT, conntrack, and network policy diagnostics

## Sources Consulted
- [Linux `connect(2)` manual page](https://man7.org/linux/man-pages/man2/connect.2.html)
- [Linux `accept(2)` manual page](https://man7.org/linux/man-pages/man2/accept.2.html)
- [Linux `getent(1)` manual page](https://man7.org/linux/man-pages/man1/getent.1.html)
- [tcpdump manual page](https://man7.org/linux/man-pages/man8/tcpdump.8.html)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [libcurl `CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS`](https://curl.se/libcurl/c/CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS.html)
- [Python Requests timeout documentation](https://docs.python-requests.org/en/latest/user/advanced/#timeouts)
- [Go `net/http/httptrace` package documentation](https://pkg.go.dev/net/http/httptrace)
- [AWS Application Load Balancer access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [Kubernetes: Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Linux kernel IP sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
- [RFC 8305: Happy Eyeballs Version 2](https://datatracker.ietf.org/doc/html/rfc8305)
- [RFC 9293: Transmission Control Protocol](https://datatracker.ietf.org/doc/html/rfc9293)
- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)

## Issues Found
- The packet-evidence table said that both the SYN and SYN-ACK leave the destination. Changed it to state that the SYN reaches the destination and the SYN-ACK leaves it, accurately describing the direction of the TCP handshake and the evidence for a return-path failure.

## Review Notes
- The curl timing variables in the probe are cumulative timestamps from the start of the transfer, not isolated per-phase durations. Their use in the post is correct as phase milestones.
- `getent ahosts` follows the system Name Service Switch and `getaddrinfo()` path, making it useful for reproducing application-visible address resolution. It does not report DNS TTLs; TTL comparison requires resolver-specific tooling when that detail is needed.
- AWS Application Load Balancer access logging is optional, best effort, and eventually consistent, so the post correctly avoids treating a missing access-log entry as definitive packet-loss evidence.
- The Kubernetes commands and the `kubernetes.io/service-name` EndpointSlice selector match the current Kubernetes documentation.
- No deprecated APIs or version-specific claims were found.
