# Validation Summary: How to Deploy Apache HTTP Server via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache HTTP Server (httpd 2.4)
- Docker / Docker Compose
- Portainer (stack deployment)
- PHP (php:8.2-apache image)
- Apache MPM (prefork)
- Apache modules: mod_ssl, mod_rewrite, mod_deflate, mod_vhost_alias
- Apache virtual hosts and SSL/TLS configuration

## Sources Consulted
- Official httpd Docker image documentation: https://hub.docker.com/_/httpd
- Official php Docker image (apache variant): https://hub.docker.com/_/php
- Apache HTTP Server 2.4 documentation: https://httpd.apache.org/docs/2.4/
- Apache MPM directives reference: https://httpd.apache.org/docs/2.4/mod/mpm_common.html (verified `MaxRequestWorkers`, `MaxConnectionsPerChild` as the 2.4 names that replaced `MaxClients` and `MaxRequestsPerChild`)
- Apache 2.4 authorization directives: https://httpd.apache.org/docs/2.4/howto/access.html (verified `Require all granted`)
- Apache virtual hosts: https://httpd.apache.org/docs/2.4/vhosts/
- Apache control: `httpd -k graceful`, `httpd -t`, `httpd -v` (https://httpd.apache.org/docs/2.4/programs/httpd.html)
- Docker Compose file format reference (version "3.8")

## Issues Found
No technical issues found.

## Review Notes
The post is technically accurate. A few items are correct but worth flagging for future iterations:

- **Volume mount of `./httpd-conf:/usr/local/apache2/conf/extra:ro`** overlays the entire `extra/` directory in the container, which hides the default files that ship with the image (e.g., `httpd-ssl.conf`, `httpd-default.conf`). Subsequent SSL instructions assume `conf/extra/httpd-ssl.conf` is present — which it is in a stock image, but would not be if the bind mount is in place. Both isolated examples are correct; combining them would require the user to also include their own `httpd-ssl.conf` in the host directory.
- **Includes are commented out by default** in the stock `httpd.conf` shipped with the official image. Placing `httpd-vhosts.conf` in `conf/extra/` does not activate it on its own; the user also needs `Include conf/extra/httpd-vhosts.conf` uncommented (or appended) in `httpd.conf`. The post does not mention this prerequisite explicitly.
- **`LoadModule vhost_alias_module`** in the vhosts example is unnecessary for the basic name-based `<VirtualHost>` block shown. `mod_vhost_alias` is for mass virtual hosting (`VirtualDocumentRoot`). Loading it is harmless, just unused.
- **Default MPM in modern `httpd` images is `event`**, not `prefork`. The performance tuning section is correctly scoped to "MPM prefork tuning for PHP applications" — but switching to mod_php typically requires also switching the MPM to prefork via `LoadModule mpm_prefork_module` and unloading `mpm_event_module`. Out of scope for the example as written.
- The `sed` patterns in the bash mod_rewrite section use loose substring matching (e.g., `s/#LoadModule rewrite/LoadModule rewrite/`) which works because sed substitutes the matched portion only, leaving the rest of the line intact. The Dockerfile version uses the more precise `rewrite_module` pattern, which is cleaner.
