# Validation Summary: How to Inventory IPv4-Only Dependencies Before Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IPv6
- Python
- Bash
- Kubernetes Services
- Docker networking
- Nginx
- Apache HTTP Server
- HAProxy
- Caddy
- DNS and resolver behavior

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Docker `network inspect` CLI reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Apache HTTP Server binding documentation: https://httpd.apache.org/docs/current/bind.html
- HAProxy frontend binding documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- Caddy `bind` directive documentation: https://caddyserver.com/docs/caddyfile/directives/bind
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The Step 1 `grep -v` filter used unescaped dots and an incomplete `255.255.255` pattern, which could suppress unintended matches. I changed it to `grep -Ev` with escaped IPv4 literals and the full `255.255.255.255` broadcast address.
- The Step 2 socket scanner prescribed `AF_INET6` plus `IPV6_V6ONLY=0` and `::` as if they were universal fixes. That guidance is platform- and software-specific, so I changed the wording to the technically correct generic recommendation to review for IPv6 or dual-stack listener support. I also widened the `AF_INET` and `bind()`/`listen()` patterns so the scanner better matches real code.
- The Step 3 config audit only searched `listen` directives even though the post also targeted Apache, HAProxy, and Caddy, which use different syntax patterns. I changed the scan to look for explicit IPv4 `listen` or `bind` directives and corrected the Kubernetes comment from “annotations” to Service family fields.
- The Kubernetes Service check assumed missing `.spec.ipFamilyPolicy` and `.spec.ipFamilies` always meant IPv4 `SingleStack`. Kubernetes defaults depend on cluster configuration, so I updated the logic to infer the family from `clusterIP`/`clusterIPs` when those fields are absent.
- The Step 4 third-party checker depended on `dnspython` without declaring that dependency. I replaced it with Python’s standard-library `socket.getaddrinfo()` and adjusted the failure message so it does not incorrectly claim every resolver error means “no AAAA record”.
- The summary report used `:::8080` and `:::80` as replacement listener syntax. That is not valid generic notation across the referenced software, so I replaced those examples with accurate IPv6 or dual-stack listener wording and noted that `PreferDualStack` depends on cluster dual-stack support.

## Review Notes
- The configuration and code scans are still heuristics rather than parsers, so some false positives and false negatives are expected in real codebases. That is acceptable for an inventory guide, but future revisions could mention runtime validation with tools such as `ss`, service manifests, and load balancer inventory.
- Docker’s IPv6 network support is documented for Linux Docker daemons. The post’s Docker snippet is still technically valid, but readers on non-Linux Docker hosts may need platform-specific validation steps.
