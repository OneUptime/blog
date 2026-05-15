# Validation Summary: How to Set Up Squid as a Forward Proxy on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Squid caching proxy
- firewalld
- systemd
- Apache htpasswd / Basic authentication

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring the Squid caching proxy server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/configuring-the-squid-caching-proxy-server_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Squid configuration directive reference for cache_dir: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid configuration directive reference for cache_mem: https://www.squid-cache.org/Doc/config/cache_mem/
- Squid configuration directive reference for maximum_object_size: https://www.squid-cache.org/Doc/config/maximum_object_size/
- Squid Web Cache wiki: NCSA Basic authentication example: https://wiki.squid-cache.org/ConfigExamples/Authenticate/Ncsa
- Apache HTTP Server htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html

## Issues Found
- The basic Squid ACL example used `CONNECT` in `http_access deny CONNECT !SSL_ports` without defining the `CONNECT` ACL in the displayed snippet. Added `acl CONNECT method CONNECT` so the snippet is self-contained and valid.
- The URL filtering snippet did not state that the deny rule must appear before broad allow rules such as `http_access allow localnet`. Added a placement comment so blocked domains are evaluated before clients are allowed.
- The authentication snippet could be ineffective if placed after existing allow rules, and `http_access allow localnet` would allow local clients to bypass authentication. Added a note to place authentication rules before other allow rules and remove `http_access allow localnet` when authentication should be mandatory.

## Review Notes
The install, service startup, firewall, cache_dir, cache_mem, maximum_object_size, client proxy environment variables, log monitoring, and htpasswd commands are technically valid for the stated RHEL 9 and Squid context. The exact `basic_ncsa_auth` helper path can vary across distributions, but `/usr/lib64/squid/basic_ncsa_auth` is consistent with RHEL-style Squid packaging.
