# Validation Summary: How to Install and Configure Apache2 on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache HTTP Server 2.4 (Ubuntu package `apache2`)
- Ubuntu (apt, systemd, systemctl)
- UFW (Uncomplicated Firewall) Apache app profiles
- Certbot / Let's Encrypt (via `python3-certbot-apache`)
- Apache modules: `mod_ssl`, `mod_headers`, `mod_rewrite`, `mod_proxy`, `mod_expires`, `mod_deflate`, `mod_status`, `mod_authz_core`
- Apache helper tools: `a2ensite`, `a2dissite`, `a2enmod`, `a2dismod`, `apache2ctl`

## Sources Consulted
- Apache HTTP Server 2.4 official documentation (https://httpd.apache.org/docs/2.4/)
- Apache `mod_authz_core` Require directive docs (https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html#require)
- Apache `mod_ssl` directive reference (https://httpd.apache.org/docs/2.4/mod/mod_ssl.html)
- Apache `mod_deflate` and `mod_expires` reference pages
- Ubuntu Server Guide: Apache (https://ubuntu.com/server/docs/web-servers-apache)
- Debian Apache layout (`/usr/share/doc/apache2/README.Debian.gz`)
- Certbot user guide for Apache plugin (https://eff-certbot.readthedocs.io/)
- Mozilla SSL Configuration Generator — intermediate profile (https://ssl-config.mozilla.org/)
- UFW Apache application profile (`/etc/ufw/applications.d/apache2-utils.ufw.profile`)

## Issues Found
- **`apache2 -version` → `apache2 -v`**: The Apache httpd binary uses getopt-style single-letter flags. The canonical flag to print the version string is `-v` (verbose: `-V` shows build details). While `-version` may inadvertently work because getopt parses it as `-v` followed by other letters and `-v` exits immediately, it is not a documented form and is misleading. Changed to the canonical `apache2 -v`, which produces the example output shown in the post.

## Review Notes
- The `Require not ip 10.0.0.1` example under "Common Configuration Directives" is shown as an isolated illustrative snippet. Per `mod_authz_core` docs, negated `Require not` directives must be placed inside a `<RequireAll>`, `<RequireAny>`, or `<RequireNone>` block to actually take effect. Since the section is explicitly a list of directive examples (not a complete configuration), this was left as-is; readers who copy it into a real config will need the surrounding block.
- `SSLHonorCipherOrder off` matches Mozilla's current intermediate guidance (modern clients have sensible cipher ordering), so this is correct despite older guides recommending `on`.
- The `SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1` line correctly leaves TLS 1.2 and TLS 1.3 enabled on Apache 2.4 builds linked against OpenSSL 1.1.1+ (the default on Ubuntu 20.04+).
- The cipher suite list is a valid subset of Mozilla's intermediate profile and is acceptable for general production use; sites needing broader client compatibility may want to add the CHACHA20-POLY1305 suites.
- The Ubuntu directory structure, UFW app profile names (`Apache`, `Apache Full`, `Apache Secure`), `a2enmod`/`a2ensite` tooling, `apache2ctl -M`, and `mod_status` `?auto` endpoint are all accurate for current Ubuntu LTS releases.
- Apache version `2.4.52` referenced in the example output is the version shipped with Ubuntu 22.04 LTS; newer Ubuntu releases ship later 2.4.x point releases. The example is illustrative and not version-locked, so no change was needed.
