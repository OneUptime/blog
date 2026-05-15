# Validation Summary: How to Install and Configure Squid Forward Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Squid forward proxy and caching proxy configuration
- DNF
- systemd
- firewalld
- SELinux
- curl
- logrotate

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring the Squid caching proxy server - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/configuring-the-squid-caching-proxy-server_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 7 documentation: Configuring the Squid service to listen on a specific port or IP address - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/configuring-the-squid-service-to-listen-on-a-specific-port-or-ip-address
- Red Hat Enterprise Linux 7 SELinux documentation: Squid caching proxy booleans and configuration examples - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/htmlsingle/selinux_users_and_administrators_guide/sect-managing_confined_services-concurrent_versioning_system-types
- Squid configuration reference: http_port - https://www.squid-cache.org/Doc/config/http_port/
- Squid configuration reference: cache_dir - https://www.squid-cache.org/Doc/config/cache_dir/
- Squid configuration reference: maximum_object_size - https://www.squid-cache.org/Doc/config/maximum_object_size/
- Squid configuration reference: cache_mem - https://www.squid-cache.org/Doc/config/cache_mem/
- Squid configuration reference: forwarded_for - https://www.squid-cache.org/Doc/config/forwarded_for/
- Squid wiki: squidclient cache manager tool - https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid wiki: Installing Squid command-line options - https://wiki.squid-cache.org/SquidFaq/InstallingSquid
- Squid configuration reference: logfile_rotate - https://www.squid-cache.org/Doc/config/logfile_rotate/

## Issues Found
- The SELinux section described `squid_connect_any` as allowing Squid to connect to the network. Red Hat documents this Boolean as permitting Squid to initiate remote connections on any port, which is broader and more specific than basic network access. Updated the comment to say it allows Squid to connect to non-standard destination ports.

## Review Notes
- The Squid configuration, cache directory example, firewall commands, systemd service commands, curl proxy tests, `squid -z`, `squid -k parse`, `squid -k rotate`, and `squidclient mgr:*` examples are technically consistent with the consulted documentation for current RHEL Squid guidance.
- `squidclient` is documented as no longer distributed with Squid 7 and later, but RHEL 9 documentation currently targets Squid versions where these examples remain plausible. Future RHEL releases using Squid 7 or later may need cache manager examples based on HTTP clients such as `curl`.
