# Validation Summary: How to Run Apache HTTP Server in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Apache HTTP Server
- Apache httpd official container image
- Container bind mounts and port publishing
- Apache modules, logging, and virtual hosts

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman top` documentation: https://docs.podman.io/en/stable/markdown/podman-top.1.html
- Docker Official Image documentation for `httpd`: https://github.com/docker-library/docs/blob/master/httpd/README.md
- Docker Official Image packaging for `httpd`: https://github.com/docker-library/httpd
- Apache HTTP Server virtual host documentation: https://httpd.apache.org/docs/current/vhosts/
- Apache HTTP Server virtual host examples: https://httpd.apache.org/docs/current/vhosts/examples.html
- Apache HTTP Server core directives documentation: https://httpd.apache.org/docs/current/mod/core.html
- Apache HTTP Server log files documentation: https://httpd.apache.org/docs/current/logs.html

## Issues Found
- The description and introduction claimed the guide covered SSL/SSL termination, but the post did not include SSL configuration or HTTPS port publishing. Removed the SSL claims so the post matches its actual content.
- The virtual host example mounted `vhosts.conf` to `conf/extra/httpd-vhosts.conf`, but the stock `httpd` image only loads extra config files when they are included from the main Apache configuration. Added an `Include conf/extra/httpd-vhosts.conf` step and mounted the updated `httpd.conf` into the virtual-host container.
- The management section used `podman exec my-apache ps aux` to inspect processes inside the container. The official `httpd` image is a slim image and should not be assumed to include `ps`; replaced it with `podman top my-apache`, the Podman command for displaying container processes.

## Review Notes
The remaining commands and configuration snippets are consistent with the current Podman CLI documentation, the Apache HTTP Server 2.4 configuration model, and the official `httpd` image layout. The examples use `httpd:latest`; pinning to a specific `httpd:2.4` tag would improve reproducibility in a future edit, but `latest` is currently a supported official image tag.
