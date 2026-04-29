# Validation Summary: How to Configure IPv6 for Server Load Balancing in Data Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- HAProxy
- NGINX
- Linux IPVS / LVS
- `iproute2`
- BGP anycast

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation" - https://datatracker.ietf.org/doc/html/rfc3849
- HAProxy 2.8 Configuration Manual - https://docs.haproxy.org/2.8/configuration.html
- HAProxy 2.8 Management Guide - https://docs.haproxy.org/2.8/management.html
- NGINX `ngx_http_core_module` (`listen`) - https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX `ngx_http_upstream_module` - https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX "Configuring HTTPS servers" - https://nginx.org/en/docs/http/configuring_https_servers.html
- NGINX `ngx_http_ssl_module` - https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Linux kernel documentation, "Transparent proxy support" - https://www.kernel.org/doc/html/v6.7/networking/tproxy.html
- Linux Virtual Server KB, "IPv6 load balancing" - https://kb.linuxvirtualserver.org/wiki/IPv6_load_balancing
- Red Hat documentation, "Load Balancer Using Direct Routing" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/load_balancer_administration/s1-lvs-direct-vsa

## Issues Found
- The example IPv6 literals used non-hexadecimal groups such as `vip` and `app`, which are not valid IPv6 text representations. I replaced them with valid documentation-prefix addresses under `2001:db8::/32`.
- The HAProxy health-check stats command referenced `/var/run/haproxy/admin.sock`, but the shown HAProxy config did not create that runtime socket. I added `stats socket /var/run/haproxy/admin.sock mode 660 level admin` to make the example consistent with the command.
- The NGINX example enabled `listen ... ssl` on port 443 but did not define `ssl_certificate` and `ssl_certificate_key`. I added those required directives so the example is valid as shown.
- The DSR section used `ip6tables` `TPROXY`, which is transparent proxying rather than direct server return load balancing. I replaced it with an IPv6 IPVS direct-routing example using `ipvsadm ... -g`.
- The DSR section implied the loopback VIP assignment was sufficient by itself. I added a short note that production DSR also requires correct return routing and neighbor discovery handling on backend servers.
- The anycast explanation said traffic goes to the "nearest" data center automatically. I corrected this to reflect routing-policy/topology-based selection rather than literal geographic distance.
- The overview tied "no NAT" to the VIP and backends being on the same network, and the conclusion implied DSR was an IPv6-specific difference from IPv4. I corrected both statements to match how proxy-based IPv6 load balancing and address conservation are actually related.

## Review Notes
- The HAProxy `option httpchk GET /health` syntax is valid, but it uses the legacy simple form. Some modern applications require an explicit HTTP/1.1 request and `Host` header for health checks.
- The NGINX `ipv6only=off` example is valid only on wildcard IPv6 listen sockets such as `[::]:80` and `[::]:443`, which matches the post's current snippet.
