# Validation Summary: How to Set Up Squid Proxy Authentication with LDAP on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Squid proxy
- LDAP and OpenLDAP client tools
- Active Directory LDAP authentication
- firewalld
- curl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up Squid as a caching proxy with LDAP authentication": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/configuring-the-squid-caching-proxy-server_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 7 documentation, "Setting up Squid as a Caching Proxy With LDAP Authentication": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/setting-up-squid-as-a-caching-proxy-with-ldap-authentication
- Squid `auth_param` configuration directive: https://www.squid-cache.org/Doc/config/auth_param/
- Squid LDAP authentication helper source/help text for `basic_ldap_auth`: https://code-reference.squid-cache.org/basic__ldap__auth_8cc_source.html
- Squid LDAP authentication configuration example: https://wiki.squid-cache.org/ConfigExamples/Authenticate/Ldap
- Squid `ext_ldap_group_acl` manual page: https://manpages.debian.org/testing/squid/ext_ldap_group_acl.8.en.html
- OpenLDAP `ldapsearch` manual page: https://man.archlinux.org/man/core/openldap/ldapsearch.1.en
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- curl manual page for proxy authentication options: https://curl.se/docs/manpage.html

## Issues Found
- The LDAPS example used `-H ldaps://ldap.example.com` together with `-Z`. In Squid's LDAP helper, `-Z` starts TLS on a regular LDAP connection, and Red Hat's documentation says to omit StartTLS when the URL uses the LDAPS protocol. I changed the example to use `-H ldaps://ldap.example.com:636` without `-Z`.

## Review Notes
- The examples use `-w` for the LDAP bind password, which is supported by `basic_ldap_auth`, but Red Hat recommends `-W /path/to/password_file` to avoid exposing the bind password in the process list and Squid configuration. This is a security hardening improvement rather than a syntax error.
