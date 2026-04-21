# Validation Summary: How to Test Ingress IPv6 Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Ingress controllers
- IPv6 and IPv4/IPv6 dual-stack networking
- DNS AAAA records
- `curl`
- `dig`
- `ping` / `ping6`
- `nmap`
- Bash scripting

## Sources Consulted
- curl man page: https://curl.se/docs/manpage.html
- BIND 9 `dig` manual pages: https://bind9.readthedocs.io/en/latest/manpages.html
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes container command and arguments documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Nmap Reference Guide, options summary: https://nmap.org/book/man-briefoptions.html
- Nmap Reference Guide, port specification: https://nmap.org/book/man-port-specification.html
- Nmap Reference Guide, IPv6 scanning option: https://nmap.org/book/man-misc-options.html
- RFC 3986, URI generic syntax for IPv6 literals: https://www.ietf.org/rfc/rfc3986.html
- RFC 3849, IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849
- Local `curl --help all`, `dig -h`, and `ping -h` command output

## Issues Found
- The first `curl -6 -v http://...` example said verbose output included a TLS handshake, but plain HTTP has no TLS handshake. Updated the HTTP comment and moved the TLS-handshake wording to the HTTPS example.
- The in-cluster ClusterIP `curl` example did not set a `Host` header, which can bypass host-based Ingress routing and produce a false negative. Added `-H "Host: myapp.example.com"` and clarified that the placeholder should be the ingress service IPv6 ClusterIP.
- The script used `dig +short AAAA "$HOST" | head -1`, which can select a CNAME line instead of an IPv6 address. Updated it to filter for IPv6-looking output before selecting the first address.
- The DNS explanation stated that no answer section always means the record is missing. Updated the wording to account for non-`NOERROR` DNS responses as well.

## Review Notes
The remaining commands and snippets are technically valid. ICMPv6 may be filtered by firewalls or load balancers even when HTTP/HTTPS over IPv6 works, so ping failures should be interpreted as a reachability signal rather than the only proof of Ingress health.
