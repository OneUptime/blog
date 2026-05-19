# Validation Summary: How to Install Element Web with Matrix on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 22.04/24.04
- Matrix
- Synapse homeserver
- Element Web
- PostgreSQL
- Nginx
- Certbot/Let's Encrypt

## Sources Consulted
- Synapse installation documentation: https://element-hq.github.io/synapse/latest/setup/installation.html
- Synapse configuration manual: https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html
- Synapse reverse proxy documentation: https://matrix-org.github.io/synapse/latest/reverse_proxy.html
- Synapse federation delegation documentation: https://matrix-org.github.io/synapse/latest/delegate.html
- Matrix Client-Server API well-known discovery: https://spec.matrix.org/latest/client-server-api/#getwell-knownmatrixclient
- Matrix Server-Server API well-known delegation: https://spec.matrix.org/latest/server-server-api/#getwell-knownmatrixserver
- Element Web installation documentation: https://web-docs.element.dev/Element%20Web/install.html
- Element Web configuration documentation: https://web-docs.element.dev/Element%20Web/config.html
- PostgreSQL CREATE DATABASE documentation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html

## Issues Found
- Added `lsb-release` and `apt-transport-https` to the dependencies because the official Synapse Debian/Ubuntu repository setup uses `lsb_release` and includes those prerequisites.
- Added `public_baseurl` to the Synapse configuration so client-facing URLs are correct when Synapse is behind the Nginx reverse proxy.
- Replaced `federation_domain_whitelist: null` with a commented example because the whitelist should be left unset to allow general federation; the configured value should be a list when used.
- Restricted the 8448 Nginx federation server block to Matrix/Synapse client paths instead of proxying every path to Synapse.
- Corrected Matrix user ID examples from email-style `@user@example.com` / `@user@matrix.example.com` to Matrix ID syntax `@user:example.com` / `@user:matrix.example.com`.
- Updated the `.well-known/matrix/server` delegation target to `matrix.example.com:8448` so it matches the federation listener configured in the tutorial.
- Replaced `add_header Content-Type application/json` with `default_type application/json` in the Nginx well-known locations, matching the documented Nginx pattern.
- Changed the certificate commands to obtain separate certificates before enabling SSL server blocks, matching the certificate paths used in the Nginx snippets and avoiding an Nginx parse failure from missing certificate files.

## Review Notes
- The Nginx examples use `listen ... http2`, which is compatible with stock Ubuntu 22.04/24.04 Nginx packages. Newer upstream Nginx also supports the separate `http2 on;` directive, but that directive is not available in the older Nginx versions shipped by these Ubuntu releases.
- Element Web also provides Debian packages, but the release tarball installation flow used in the post is still supported by Element's documentation.
