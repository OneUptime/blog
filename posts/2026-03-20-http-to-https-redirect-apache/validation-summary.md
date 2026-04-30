# Validation Summary: How to Set Up HTTP to HTTPS Redirection on Apache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache HTTP Server
- HTTPS
- TLS
- `mod_alias`
- `mod_rewrite`
- `mod_ssl`
- `mod_headers`
- Let's Encrypt / ACME
- `curl`

## Sources Consulted
- Apache `mod_alias` documentation: https://httpd.apache.org/docs/2.4/mod/mod_alias.html
- Apache `mod_rewrite` documentation: https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html
- Apache `mod_ssl` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache `mod_headers` documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache core `AllowOverride` documentation: https://httpd.apache.org/docs/2.4/mod/core.html#allowoverride
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Debian `a2enmod(8)` man page: https://manpages.debian.org/unstable/apache2/a2enmod.8.en.html
- Debian `a2ensite(8)` man page: https://manpages.debian.org/testing/apache2/a2ensite.8.en.html

## Issues Found
- The introduction claimed that forcing HTTPS ensures all traffic is encrypted. I changed this to a narrower claim because an HTTP-to-HTTPS redirect does not make the initial HTTP request itself encrypted.
- The HTTPS VirtualHost example used `SSLCertificateFile` with `cert.pem` and a separate `SSLCertificateChainFile`. I changed it to use `fullchain.pem` and removed `SSLCertificateChainFile` because Apache 2.4.8+ loads intermediate certificates from `SSLCertificateFile`, and Certbot documents `fullchain.pem` as the correct file for modern Apache.

## Review Notes
- The Apache helper commands and paths shown in the post (`a2enmod`, `a2ensite`, `/etc/apache2`, `apache2`) are Debian/Ubuntu-specific rather than universal across all Apache installations.
- The ACME challenge exclusions in the rewrite examples are valid, but Let's Encrypt's HTTP-01 validation can follow redirects to HTTPS, so these exclusions are optional in many setups.
