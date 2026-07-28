# Validation Summary: Connection Refused vs Timed Out: What Each Error Reveals

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- TCP connection establishment, resets, and retransmission timeouts
- Linux socket errors (`ECONNREFUSED` and `ETIMEDOUT`)
- Linux network diagnostics with `ss`, `getent`, and `tcpdump`
- curl connection diagnostics and address overrides
- DNS resolution
- Firewalls, routing, NAT, proxies, and load balancers
- Kubernetes Services, EndpointSlices, readiness probes, and network policy

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP) - https://www.rfc-editor.org/rfc/rfc9293.html
- Linux `connect(2)` manual page - https://man7.org/linux/man-pages/man2/connect.2.html
- Linux `getent(1)` manual page - https://man7.org/linux/man-pages/man1/getent.1.html
- iproute2 `ss(8)` manual page - https://man7.org/linux/man-pages/man8/ss.8.html
- tcpdump manual page - https://man7.org/linux/man-pages/man8/tcpdump.8.html
- curl command-line manual - https://curl.se/docs/manpage.html
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Kubernetes: Debug Services - https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- RFC 9110: HTTP Semantics, 504 Gateway Timeout - https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout

## Issues Found
- The post generalized RFC 9293's `connection refused` notification to any valid reset answering an active open. RFC 9293 uses that notification for the specific case of a reset in `SYN-RECEIVED` when the connection originated from an active open; its `SYN-SENT` reset-processing text instead says `connection reset`. Removed the generalized sentence and retained the accurate, Linux-specific `connect(2)` description of `ECONNREFUSED`.

## Review Notes
The remaining TCP explanations, packet-flow examples, diagnostic table, curl options, Kubernetes commands, and external links matched current authoritative documentation. The `ss -p` output can be limited by the caller's permissions, and tcpdump's `any` pseudo-interface is Linux-specific; both commands are appropriate in this Linux-focused post.
