# Validation Summary: How to Cache YUM/DNF Repositories with Squid Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Squid proxy
- YUM/DNF repository configuration
- firewalld
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux documentation, "Configuring Squid as a caching proxy without authentication": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/deploying_web_servers_and_reverse_proxies/index
- Red Hat Enterprise Linux documentation, "Configuring DNF": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_configuring-yum_managing-software-with-the-dnf-tool
- DNF Configuration Reference: https://dnf.readthedocs.io/en/stable/conf_ref.html
- Squid configuration reference, `http_access`: https://www.squid-cache.org/Doc/config/http_access/
- Squid configuration reference, `acl`: https://www.squid-cache.org/Doc/config/acl/
- Squid configuration reference, `cache_dir`: https://www.squid-cache.org/Doc/config/cache_dir/
- Squid configuration reference, `maximum_object_size`: https://www.squid-cache.org/Doc/config/maximum_object_size/
- Squid configuration reference, `range_offset_limit`: https://www.squid-cache.org/Doc/config/range_offset_limit/
- Squid configuration reference, `refresh_pattern`: https://www.squid-cache.org/Doc/config/refresh_pattern/
- Squid configuration reference, `cache_store_log`: https://www.squid-cache.org/Doc/config/cache_store_log/
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat SELinux documentation for `squid_connect_any`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/htmlsingle/selinux_users_and_administrators_guide/sect-managing_confined_services-bind-configuration_examples

## Issues Found
- The Squid configuration defined `Safe_ports` but did not enforce it. Added the standard `SSL_ports` and `CONNECT` ACLs plus `http_access deny !Safe_ports` and `http_access deny CONNECT !SSL_ports`, matching Squid's recommended access-control pattern.
- `range_offset_limit -1` did not match Squid's documented syntax for always fetching range requests from the beginning so the response can be cached. Changed it to `range_offset_limit none`.
- The SSL bump comment suggested "peek and splice" for HTTPS repositories. A normal Squid forward proxy tunnels HTTPS with CONNECT and does not cache the encrypted RPM objects; "splice" also passes traffic through rather than decrypting/caching it. Reworded the note to state that RHEL CDN HTTPS repositories are tunneled and not cached by a normal proxy.
- The per-repository example edited `/etc/yum.repos.d/redhat.repo` and targeted a `[baseos]` section, which is not a typical RHSM-managed RHEL repository ID and can be overwritten by Subscription Manager. Changed the example to a custom HTTP repository file and section name.
- Removed the redundant `\.srpm$` refresh rule. Source RPMs conventionally end in `.src.rpm`, which is already matched by the `.rpm` rule.
- The closing paragraph implied all repositories would be served from cache. Clarified that this applies to HTTP-based repositories.

## Review Notes
The tutorial is accurate for plain HTTP repositories or internal mirrors served over HTTP. For standard Red Hat CDN repositories over HTTPS, this proxy configuration can still provide proxy access, but it will not cache package payloads unless the repository traffic is made cacheable through an HTTP mirror or a carefully managed TLS interception design.
