# Validation Summary: How to Handle IPv6 Migration for Legacy Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Nginx
- NAT64 / DNS64
- TAYGA
- BIND 9
- socat
- Kubernetes
- iptables

## Sources Consulted
- NGINX `ngx_http_upstream_module` keepalive documentation - https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive
- TAYGA upstream project page - http://www.litech.org/tayga/
- TAYGA upstream README - https://github.com/apalrd/tayga/blob/main/README.md
- TAYGA usage guide - https://github.com/apalrd/tayga/blob/main/docs/README.md
- TAYGA `tayga.conf(5)` documentation - https://github.com/apalrd/tayga/blob/main/docs/man/tayga.conf.5.md
- TAYGA `tayga(8)` documentation - https://github.com/apalrd/tayga/blob/main/docs/man/tayga.8.md
- BIND 9 Administrator Reference, `dns64` - https://bind9.readthedocs.io/en/v9.20.2/reference.html#dns64
- RFC 6052, "IPv6 Addressing of IPv4/IPv6 Translators" - https://datatracker.ietf.org/doc/html/rfc6052
- RFC 6147, "DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers" - https://datatracker.ietf.org/doc/html/rfc6147
- Kubernetes Deployments documentation - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes IPv4/IPv6 dual-stack documentation - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- `socat(1)` manual page - https://www.man7.org/linux/man-pages/man1/socat.1.html
- `iptables-extensions(8)` manual page, `MASQUERADE` target - https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The Nginx example described `keepalive_timeout` in a `location` block as backend connection reuse. NGINX documents upstream keepalive separately, so I removed the misleading `keepalive_timeout` line and narrowed the comment to the actual `proxy_http_version 1.1` behavior.
- The NAT64 section described the pattern too broadly. RFC 6147 defines DNS64/NAT64 for IPv6 clients reaching IPv4 servers, so I clarified the text to scope this strategy to IPv6-only or IPv6-preferred environments that still need IPv4-only external services.
- The TAYGA example omitted required host-side interface addressing even though TAYGA documents that the administrator must configure the TUN interface with `ip(8)` or equivalent. I added explicit `ip addr add` commands and kept the route setup aligned with the configured prefix.
- The original NAT64 example mixed the well-known `64:ff9b::/96` prefix with documentation/private-style sample IPv4 usage in a way that is awkward for a strict RFC 6052 example. I switched the sample to a documentation network-specific prefix and updated both the TAYGA and BIND snippets so the configured NAT64/DNS64 prefix is consistent end to end.
- TAYGA is documented as stateless NAT64, so a private dynamic IPv4 pool needs an extra NAT44 step for outbound IPv4 internet access unless a routed public pool is available. I added the `iptables` `MASQUERADE` example to reflect that requirement.
- The `socat` wrapper listened on `::1` but printed `[::]`, which would misstate actual reachability. I removed the loopback-only bind so the command matches the printed listener address.
- The Kubernetes `Deployment` manifest was invalid for `apps/v1` because it lacked a required selector and matching pod labels. I added `metadata.labels`, `.spec.selector.matchLabels`, and matching template labels, and I clarified that the sidecar pattern assumes dual-stack or IPv6-capable Kubernetes networking.

## Review Notes
- The post is now technically consistent, but the NAT64 example still uses `iptables` because the upstream TAYGA examples do. On systems standardized on `nftables`, an equivalent NAT rule would be more current operationally.
- The sidecar example now notes the dual-stack prerequisite, but real deployments still need an IPv6-capable Service or Ingress path in addition to the Pod-side proxy.
