# Validation Summary: How to Configure Apache VirtualHosts with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server virtual hosts
- IPv6 listener and address configuration
- Apache `mod_ssl`
- Apache `mod_headers`
- `curl`

## Sources Consulted
- Apache HTTP Server core `<VirtualHost>` directive: https://httpd.apache.org/docs/current/en/mod/core.html
- Apache HTTP Server binding and `Listen` documentation: https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server name-based virtual hosts: https://httpd.apache.org/docs/current/vhosts/name-based.html
- Apache HTTP Server virtual host matching details: https://httpd.apache.org/docs/current/en/vhosts/details.html
- Apache HTTP Server virtual host examples: https://httpd.apache.org/docs/current/en/vhosts/examples.html
- Apache `mod_ssl` reference: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Apache `mod_headers` reference: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- curl manpage: https://curl.se/docs/manpage.html

## Issues Found
- The post treated `<VirtualHost [::]:80>` and `<VirtualHost [::]:443>` as wildcard IPv6 virtual hosts. Apache documents `*` as the wildcard match and performs exact IP matching before wildcard matching, so I replaced those examples with either `*:port` or a concrete IPv6 address.
- The name-based IPv6 examples mixed `*:80` and `[::]:80` in a way that would not route requests as described. I changed them to repeat the same concrete IPv6 address across the relevant `VirtualHost` blocks, which is how Apache performs name-based matching on a single IPv6 address.
- The verification step `curl -6 -v ... | grep Server` does not identify which virtual host Apache selected; it only inspects the response `Server` header. I replaced it with explicit `Host` header tests against the same IPv6 address.

## Review Notes
- `a2ensite`, `apache2ctl`, and `${APACHE_LOG_DIR}` are Debian/Ubuntu-specific, which matches the post's comments.
