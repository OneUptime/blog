# Validation Summary: How to Resolve IPv4 Addresses for Microservice Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python `socket` module
- Kubernetes Services
- Kubernetes DNS-based service discovery
- IPv4 networking
- Environment-variable-based service discovery

## Sources Consulted
- Python `socket` documentation: https://docs.python.org/3/library/socket.html#socket.getaddrinfo
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The Python DNS examples called `socket.getaddrinfo()` with only `AF_INET`, which Python documents as leaving `type` and `proto` behavior system-specific. I updated those calls to specify `SOCK_STREAM` and `IPPROTO_TCP` so the examples consistently resolve TCP client addresses as described.
- The headless-service examples collected raw `getaddrinfo()` results directly, which can include duplicate addresses for multiple socket kinds. I changed those snippets to de-duplicate while preserving order with `dict.fromkeys(...)`.
- The round-robin client example imported `httpx` without using it. That made the snippet fail on systems where `httpx` was not installed even though the example never performs an HTTP request, so I removed the unnecessary dependency.
- The Kubernetes wording implied DNS-side round-robin and “all pod IPs” too broadly. I corrected this to client-side round-robin and clarified that the DNS records map to the ready pod IPs for the headless-service example.

## Review Notes
- The Python type annotations use built-in generics such as `list[str]` and `tuple[str, int]`, so the examples assume Python 3.9 or newer.
- The environment-variable parsing example is intentionally IPv4-oriented and does not handle bracketed IPv6 literals, which is consistent with the post's scope.
