# Validation Summary: How to Set Up Apache mod_proxy_ajp for IPv4 Tomcat Backend Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- Apache `mod_proxy_ajp`
- Apache `mod_proxy_balancer`
- Apache `mod_lbmethod_byrequests`
- Apache Tomcat
- AJP
- `iptables`

## Sources Consulted
- Apache HTTP Server `mod_proxy_ajp` documentation: https://httpd.apache.org/docs/2.4/mod/mod_proxy_ajp.html
- Apache HTTP Server `mod_proxy` documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache HTTP Server `mod_proxy_balancer` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_balancer.html
- Apache HTTP Server `mod_lbmethod_byrequests` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_lbmethod_byrequests.html
- Apache Tomcat 9 AJP Connector documentation: https://tomcat.apache.org/tomcat-9.0-doc/config/ajp.html
- Apache Tomcat 9 Migration Guide: https://tomcat.apache.org/migration-9
- Apache Tomcat 9 Security Considerations: https://tomcat.apache.org/tomcat-9.0-doc/security-howto.html
- Debian `a2enmod` man page: https://manpages.debian.org/unstable/apache2/a2enmod.8.en.html
- Debian `apache2ctl` man page: https://manpages.debian.org/unstable/apache2/apache2ctl.8.en.html

## Issues Found
- The original Tomcat example disabled the AJP secret with `secretRequired="false"`. I changed it to use `secret="YOUR_AJP_SECRET"` and updated the Apache `ProxyPass` and `BalancerMember` examples to pass the matching `secret=` value, because current Tomcat versions require a secret by default and Apache httpd supports passing it in supported releases.
- The load-balancing section used `mod_proxy_balancer` and `lbmethod=byrequests` but the module-enablement section only enabled `proxy` and `proxy_ajp`. I added `proxy_balancer` and `lbmethod_byrequests` so the load-balancing example matches Apache’s documented module requirements.
- The verification command only grepped for `proxy`, which would not confirm that `lbmethod_byrequests` was loaded. I updated it to `grep -E 'proxy|lbmethod'`.
- The introduction claimed AJP is faster than HTTP for internal proxying. I replaced that with a neutral description of AJP’s binary protocol and persistent connections, because the current Apache/Tomcat documentation does not support a blanket performance claim of that kind.
- The Tomcat connector section was slightly ambiguous for remote backends. I clarified that the `address` should be the IPv4 loopback or the specific internal IPv4 address that Apache will connect to.

## Review Notes
- Apache httpd documents the `secret=` parameter for `ProxyPass` and `BalancerMember` as available in 2.4.42 and later. The post now reflects that version caveat.
- Tomcat 9.0.31 changed AJP defaults in relevant ways: the default listen address became loopback, `secretRequired` was added, and the connector will not start unless a secret is configured when `secretRequired` remains `true`.
- AJP is a clear-text protocol. The shared secret helps control access, but it does not encrypt traffic, so firewall restrictions and trusted-network placement are still necessary.
