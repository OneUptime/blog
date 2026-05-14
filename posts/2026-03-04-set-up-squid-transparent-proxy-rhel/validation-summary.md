# Validation Summary: How to Set Up Squid as a Transparent Proxy on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Squid
- Transparent HTTP proxying
- iptables
- nftables
- Linux IP forwarding
- SELinux

## Sources Consulted
- Squid `http_port` directive documentation: https://www.squid-cache.org/Doc/config/http_port/
- Squid `https_port` directive documentation: https://www.squid-cache.org/Doc/config/https_port/
- Squid `ssl_bump` directive documentation: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid Linux REDIRECT interception example: https://wiki.squid-cache.org/ConfigExamples/Intercept/LinuxRedirect
- Squid Interception Proxy FAQ: https://wiki.squid-cache.org/SquidFaq/InterceptionProxy
- Red Hat Enterprise Linux 9 firewall and nftables documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- Red Hat SELinux Squid booleans documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-squid_caching_proxy-booleans
- Local command help for `iptables` and `nft`.

## Issues Found
- The Squid configuration included `https_port 3129 intercept ssl-bump cert=/etc/squid/ssl/squid-ca.pem`, but the post did not create or install a CA certificate, configure `ssl_bump` rules, or redirect port 443 traffic. Current Squid documentation also documents `tls-cert=` for HTTPS ports. Removed the incomplete HTTPS listener from the base configuration and clarified that the sample intercepts HTTP traffic.
- The iptables example duplicated HTTP redirect rules and allowed unrestricted access to Squid's intercept listener. Replaced it with a LAN-scoped redirect, a mangle-table drop for direct access to the intercept port before NAT, and a LAN-scoped INPUT rule.
- The iptables established-connection rule used the older `state` match. Updated it to the current `conntrack` match syntax shown by local `iptables` help.
- The nftables chain command omitted `--` before the negative priority and used shell-sensitive braces without quoting. Updated the command to match Red Hat's documented syntax.
- The nftables persistence example wrote a ruleset file but did not include it in `/etc/sysconfig/nftables.conf` or enable the `nftables` service. Added the include and service enablement commands per Red Hat documentation.
- The SELinux comment said `squid_connect_any` allowed interception. Red Hat documents that boolean as allowing Squid outbound connections to any remote port. Corrected the comment and added `squid_use_tproxy` for transparent proxy policy support.

## Review Notes
The corrected post remains an HTTP transparent proxy guide. HTTPS interception is intentionally left as a caveat because a complete SSL-Bump setup requires certificate generation, client trust deployment, `ssl_bump` policy rules, and port 443 redirection.
