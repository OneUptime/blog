# Validation Summary: How to Run Apache httpd in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Apache HTTP Server httpd 2.4
- Apache modules: mod_rewrite, mod_proxy, mod_proxy_http, mod_proxy_wstunnel, mod_ssl, mod_headers, mod_deflate, mod_status
- TLS certificates with OpenSSL
- Virtual hosts, reverse proxying, .htaccess, logging, and health checks

## Sources Consulted
- Docker Official Image for httpd: https://hub.docker.com/_/httpd
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services and healthcheck reference: https://docs.docker.com/reference/compose-file/services/
- Apache mod_proxy documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache mod_ssl documentation: https://httpd.apache.org/docs/2.4/mod/mod_ssl.html
- Apache SSL/TLS documentation: https://httpd.apache.org/docs/2.4/ssl/
- Apache mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache mod_deflate documentation: https://httpd.apache.org/docs/current/mod/mod_deflate.html
- Apache mod_status documentation: https://httpd.apache.org/docs/current/mod/mod_status.html
- Apache core AllowOverride documentation: https://httpd.apache.org/docs/2.4/en/mod/core.html#allowoverride
- Apache mod_rewrite documentation: https://httpd.apache.org/docs/2.4/rewrite/
- OpenSSL req documentation: https://docs.openssl.org/3.6/man1/openssl-req/

## Issues Found
- The Quick Start mounted `$(pwd)/html` before creating the `html` directory. Docker can create a missing bind-mount source directory with host-side ownership that may prevent the following `echo` command from writing the test file. I reordered the example so the directory and `index.html` are created first.
- The Docker Compose examples used the top-level `version: "3.8"` key. Current Docker Compose treats this key as obsolete and only informative, so I removed it from both Compose snippets.
- The module guidance said to uncomment all listed modules, but the official `httpd:2.4` image already loads some modules such as `headers_module` by default. I changed the wording to "ensure" modules are enabled when needed.
- The self-signed certificate command only set the certificate common name. Modern TLS clients expect hostnames in the Subject Alternative Name extension, so I added `-addext "subjectAltName=DNS:localhost"`.
- The monitoring snippet told readers to add `LoadModule status_module`, but the official `httpd:2.4` image already loads `mod_status`, which would produce a duplicate-module warning. I changed that line to a commented fallback for custom configurations.
- The logging command used `docker logs -f apache` while the virtual host examples write to files under `/usr/local/apache2/logs`. I changed it to tail the configured vhost access log inside the container.

## Review Notes
The remaining examples are consistent with Apache httpd 2.4 and the official Docker image. `X-XSS-Protection` is obsolete in modern browsers and could be reconsidered in a future content refresh, but it is syntactically valid as an Apache header directive.
