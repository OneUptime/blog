# Validation Summary: How to Configure Apache mod_proxy_balancer for Load Balancing on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- mod_proxy
- mod_proxy_balancer
- Apache load-balancing scheduler modules
- mod_proxy_hcheck
- mod_status balancer-manager
- mod_ssl

## Sources Consulted
- Apache HTTP Server 2.4 mod_proxy_balancer documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy_balancer.html
- Apache HTTP Server 2.4 mod_proxy documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy.html
- Apache HTTP Server 2.4 mod_proxy_hcheck documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy_hcheck.html
- Apache HTTP Server 2.4 mod_heartbeat documentation: https://httpd.apache.org/docs/2.4/mod/mod_heartbeat.html
- Apache HTTP Server 2.4 mod_lbmethod_bybusyness documentation: https://httpd.apache.org/docs/2.4/mod/mod_lbmethod_bybusyness.html
- Apache HTTP Server 2.4 mod_lbmethod_bytraffic documentation: https://httpd.apache.org/docs/2.4/mod/mod_lbmethod_bytraffic.html
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html

## Issues Found
- The `maxattempts` comment incorrectly described the setting as a maximum number of requests before connection recycling. Changed it to describe Apache's actual meaning: maximum failover attempts before giving up.
- The prerequisites enabled `mod_proxy_balancer` but did not enable `mod_status`, which is required for balancer-manager support. Added `sudo a2enmod status`.
- The heartbeat scheduler explanation placed both `mod_heartbeat` and `mod_heartmonitor` on the backend servers. Corrected it to state that `mod_lbmethod_heartbeat` and `mod_heartmonitor` run on the proxy, while `mod_heartbeat` runs on the backend origin servers.
- The SSL virtual host example used `SSLEngine` and certificate directives without showing that `mod_ssl` must be enabled. Added `sudo a2enmod ssl` to the SSL section.
- The log-watching command piped the access log through `grep BALANCER_WORKER`, but the configured `LogFormat` writes the backend route value, not the literal variable name. Removed the misleading grep so the logged route can be observed directly.

## Review Notes
The remaining Apache directives and examples are consistent with Apache HTTP Server 2.4 documentation. In a future revision, the post could mention that `mod_proxy_hcheck` is available in Apache HTTP Server 2.4.21 and later, but current supported Ubuntu releases ship sufficiently new Apache 2.4 builds.
