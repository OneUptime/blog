# Validation Summary: How to Set Up Apache Load Balancing with mod_proxy_balancer on IPv4

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- Apache HTTP Server 2.4
- `mod_proxy`, `mod_proxy_http`, and `mod_proxy_balancer`
- Apache load-balancer schedulers: `mod_lbmethod_byrequests`, `mod_lbmethod_bytraffic`, and `mod_lbmethod_bybusyness`
- Sticky sessions with `mod_headers`
- `balancer-manager` with `mod_status`
- Debian/Ubuntu Apache module management with `a2enmod`

## Sources Consulted
- [Apache HTTP Server 2.4: `mod_proxy_balancer`](https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_balancer.html)
- [Apache HTTP Server current: `mod_proxy`](https://httpd.apache.org/docs/current/mod/mod_proxy.html)
- [Apache HTTP Server 2.4: `mod_proxy_hcheck`](https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_hcheck.html)
- [Apache HTTP Server current: Reverse Proxy Guide](https://httpd.apache.org/docs/current/en/howto/reverse_proxy.html)
- [Debian manpage: `a2enmod(8)`](https://manpages.debian.org/unstable/apache2/a2enmod.8.en.html)

## Issues Found
1. The introduction said `mod_proxy_balancer` provides health monitoring. Apache documents dynamic health checks under `mod_proxy_hcheck`, so I corrected the sentence to separate load balancing from health-check functionality.
2. The post configured `balancer-manager` but did not enable `mod_status`, which Apache documents as required for balancer-manager support. I added `sudo a2enmod status` to the module list.
3. The post described `lbmethod=byrequests` as round-robin in several places. Apache documents `byrequests` as request-count scheduling, so I updated the description, module comments, section heading, inline config comment, and conclusion to use the correct terminology.

## Review Notes
- The `BalancerMember ... status=+H` hot-standby example matches the current `mod_proxy` documentation.
- The sticky-session cookie example matches the upstream `mod_proxy_balancer` example using `BALANCER_WORKER_ROUTE` and `BALANCER_ROUTE_CHANGED`.
- Local checks: `validation.json` was validated with `jq`. Apache binaries and Debian helper commands are not installed in this workspace, so command and configuration verification relied on official Apache documentation and the Debian `a2enmod(8)` manpage rather than local `--help` output or `apachectl -t`.
