# Validation Summary: How to Troubleshoot Application Failures After Enabling FIPS Mode on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- FIPS mode and system-wide crypto policies
- OpenSSL
- Java security providers
- Python hashlib
- PostgreSQL TLS configuration
- MariaDB/MySQL TLS configuration
- Apache HTTPD and Nginx TLS configuration
- SSSD, LDAP, and Active Directory
- Samba/CIFS

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, "Switching RHEL to FIPS mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat RHEL core cryptographic components: https://access.redhat.com/articles/3655361
- Red Hat Enterprise Linux 9 Deploying web servers and reverse proxies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 Configuring and using network file services, Samba in FIPS mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- PostgreSQL documentation for ssl_ciphers: https://www.postgresql.org/docs/15/runtime-config-connection.html
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- OpenSSL ciphers command documentation: https://docs.openssl.org/3.5/man1/openssl-ciphers/
- MariaDB SSL/TLS system variables documentation: https://mariadb.com/docs/server/security/encryption/data-in-transit-encryption/ssltls-system-variables
- MySQL 8.0 encrypted connection TLS protocols and ciphers documentation: https://dev.mysql.com/doc/refman/8.0/en/encrypted-connection-protocols-ciphers.html

## Issues Found
- The introduction said FIPS mode disables all non-approved cryptographic algorithms system-wide. Red Hat documents this more specifically as RHEL core cryptographic components and system-provided application defaults following the active crypto policy, with some application and API caveats. I changed the wording to avoid overstating enforcement for every possible application.
- The MD5 bullet implied all checksum use is categorically disabled. Python documents `usedforsecurity=False`, and RHEL/OpenSSL behavior depends on whether the hash is requested in a security context and through a FIPS-aware provider. I clarified that the problem is security-sensitive MD5 use or libraries that block MD5 in FIPS mode.
- The OpenSSL command `openssl errstr 0x00000000` was syntactically valid but not useful for diagnosing FIPS failures because error code zero does not represent the actual failure. I replaced it with checks for the active crypto policy, loaded OpenSSL providers, and an `openssl s_client` reproduction command.
- The MariaDB/MySQL example recommended hard-coded `AES256-SHA256:AES128-SHA256` ciphers. Those are legacy TLS 1.2 cipher-suite names and may not match the active RHEL FIPS policy. I changed the snippet to use `PROFILE=SYSTEM` on RHEL builds where OpenSSL honors system crypto policy cipher strings.
- The Nginx snippet used `ssl_ciphers PROFILE=SYSTEM` as a direct recommendation. Upstream Nginx documents `ssl_ciphers` as an OpenSSL cipher string and Red Hat's Nginx guide does not document `PROFILE=SYSTEM` for Nginx the way it documents system policy behavior for Apache. I changed the guidance to avoid hard-coded legacy cipher lists and to use an OpenSSL cipher string allowed by the active RHEL crypto policy if `ssl_ciphers` is set.

## Review Notes
The post is now technically valid as a practical troubleshooting guide. Some examples remain intentionally generic, such as framework-specific Java digest configuration and application-specific log paths, but they are presented as examples rather than universal fixes.
