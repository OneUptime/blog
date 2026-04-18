# Validation Summary: How to Troubleshoot IPv4 Connectivity Issues Between Microservices

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv4 networking fundamentals
- DNS resolution (nslookup, dig, CoreDNS, /etc/resolv.conf)
- Bash built-in /dev/tcp port probing
- ping / curl
- ss / netstat for socket inspection
- iptables firewall rules
- nmap port scanning
- Kubernetes (Services, Endpoints, NetworkPolicy, kubectl)
- Python 3 socket module (socket.create_connection, socket.getaddrinfo)

## Sources Consulted
- Python 3 socket module documentation: https://docs.python.org/3/library/socket.html
- Bash /dev/tcp feature (Bash Reference Manual, "Redirections"): https://www.gnu.org/software/bash/manual/bash.html
- iptables(8) man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- ss(8) man page: https://man7.org/linux/man-pages/man8/ss.8.html
- nmap documentation: https://nmap.org/book/man.html
- Kubernetes Services and Endpoints: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS spec: https://github.com/kubernetes/dns/blob/master/docs/specification.md
- Local verification of `socket.create_connection` signature via `help()` on Python 3

## Issues Found
No technical issues found.

All shell commands (ping, curl, ss, netstat, iptables, nmap, kubectl) use valid flags and syntax. The bash `/dev/tcp` port-check idiom is correct. The DNS FQDN pattern `auth-service.default.svc.cluster.local` matches the Kubernetes DNS specification. The Python `socket.create_connection((host, port), timeout=timeout)` usage matches the documented signature, and the exception tuple (`socket.timeout, ConnectionRefusedError, OSError`) is valid — `ConnectionRefusedError` is a subclass of `OSError` (redundant but not incorrect), and `socket.timeout` remains a valid alias for `TimeoutError` in Python 3.10+.

## Review Notes
- The `kubectl get endpoints` command still works but is being phased out in favor of `EndpointSlices`; in future revisions the post could mention `kubectl get endpointslices` for clusters on recent Kubernetes versions.
- The Mermaid flowchart uses `\n` inside node labels for line breaks. Current Mermaid renderers accept this, though `<br/>` is the more portable form across older renderers.
- `netstat` is deprecated on most modern Linux distributions in favor of `ss`; the post already shows both, which is good for broad compatibility.
- The catch of both `ConnectionRefusedError` and `OSError` is redundant (the former inherits from the latter) but harmless and arguably more readable.
