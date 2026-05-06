# Validation Summary: How to Configure Apache mod_security with IPv6 Rules

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Apache HTTP Server
- ModSecurity 2.x for Apache
- OWASP Core Rule Set (CRS)
- IPv6
- curl
- Debian/Ubuntu and RHEL/CentOS package configuration

## Sources Consulted
- ModSecurity Reference Manual (v2.x): https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-(v2.x)
- ModSecurity Operators Reference (`ipMatch`): https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-(v2.x)-Operators
- Apache HTTP Server 2.4 core docs (`<VirtualHost>`): https://httpd.apache.org/docs/current/en/mod/core.html
- Apache HTTP Server 2.4 binding docs (`Listen` and IPv6 binding behavior): https://httpd.apache.org/docs/current/bind.html
- OWASP CRS installation docs: https://coreruleset.org/docs/1-getting-started/1-1-crs-installation/
- OWASP CRS official repository: https://github.com/coreruleset/coreruleset
- Debian `libapache2-mod-security2` package file list: https://packages.debian.org/sid/amd64/libapache2-mod-security2/filelist
- Red Hat Enterprise Linux ModSecurity deployment docs: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/deploying_different_types_of_servers/deploying-different-types-of-servers.pdf
- curl man page: https://curl.se/docs/manpage.html
- curl URL syntax reference: https://curl.se/docs/url-syntax.html

## Issues Found
- The Debian/Ubuntu install steps referenced `/etc/modsecurity/modsecurity.conf`, but the package ships `modsecurity.conf-recommended`. I added the copy step so the referenced config file actually exists and is loaded.
- The comment `Check version` was inaccurate because `apachectl -M | grep ...` verifies that the module is loaded, not its version. I corrected the description.
- Two sample IPv6 prefixes used non-hex text (`office` and `badactors`), which made them invalid IPv6 literals. I replaced them with valid documentation-prefix examples.
- The IPv6 detection regex would also match IPv4 addresses that begin with digits. I replaced it with native IPv6 matching via `@ipMatch ::/0`, which is explicitly documented as supporting IPv6.
- The rate-limiting example updated the `IP` collection without initializing it first. I added `initcol:ip=%{REMOTE_ADDR}` and chained the threshold check so the example matches documented persistent-collection usage.
- The CRS include example targeted `/etc/apache2/conf-available/modsecurity.conf`, which is not the Debian package’s shipped module config file. I changed it to `security2.conf` and updated the include order to match current CRS installation guidance, including optional plugin hooks.
- The test `curl` URLs contained unencoded spaces and raw payload strings that are not valid URLs for curl input. I replaced them with valid URL-encoded payloads and used a CRS verification request format consistent with the official CRS docs.
- The audit-log grep searched for the literal string `REMOTE_ADDR`, which is not how the audit log records client addresses. I changed the log checks to inspect recent audit entries and grep the custom `logdata` emitted by the example IPv6 rule.
- The virtual host example could be read as sufficient by itself for IPv6 binding. I added a note that Apache also needs an IPv6 `Listen` directive because `<VirtualHost>` alone does not change listening sockets.

## Review Notes
- The post is now technically valid, but several config paths are Debian/Ubuntu-specific and are marked as such. RHEL/CentOS uses different default locations.
- The examples target ModSecurity 2.x for Apache, which matches the `libapache2-mod-security2` package and the current v2.x reference manual used for validation.
- Using a pinned CRS release plus signature verification would improve reproducibility over cloning the moving default branch, but the existing commands remain technically valid.
- `SecTmpDir` and `SecDataDir` under `/tmp` will work, but a dedicated writable directory is usually a better hardening choice.
