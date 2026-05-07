# Validation Summary: How to Set Up Name-Based Virtual Hosts on a Single IPv4 Address in Apache

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server 2.4
- Apache name-based virtual hosts
- Debian/Ubuntu Apache site management (`a2ensite`, `/etc/apache2/sites-available`)
- `curl`

## Sources Consulted
- Apache HTTP Server 2.4: Name-based Virtual Host Support: https://httpd.apache.org/docs/current/vhosts/name-based.html
- Apache HTTP Server 2.4: apachectl program reference: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Apache HTTP Server 2.4: Access Control: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache HTTP Server 2.4: mod_authz_core: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server 2.4: Upgrading to 2.4 from 2.2: https://httpd.apache.org/docs/current/upgrading.html
- Debian `a2ensite(8)` man page: https://manpages.debian.org/bookworm/apache2/a2ensite.8.en.html
- curl tutorial: https://curl.se/docs/tutorial.html

## Issues Found
- The post presented Debian/Ubuntu-specific paths and helper commands (`/etc/apache2/sites-available`, `a2ensite`, `${APACHE_LOG_DIR}`, `apache2`) as if they were generic Apache conventions. I added a short clarification that the examples use the Debian/Ubuntu Apache layout.
- The default virtual host example said `Require all denied` would "Return 404". Apache documents `Require all denied` as an unconditional deny, and Apache's access-control behavior for denied requests is a `403 Forbidden` response. I corrected the comment to `403`.

## Review Notes
- The post is technically correct after the fixes above.
- The walkthrough assumes the example hostnames resolve to `192.168.1.10`, whether through DNS or a local hosts file during testing.
- The examples are HTTP-only. Equivalent HTTPS virtual hosts on a shared IPv4 address also require TLS certificate configuration and SNI-capable clients.
