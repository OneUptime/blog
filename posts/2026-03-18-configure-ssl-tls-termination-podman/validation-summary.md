# Validation Summary: How to Configure SSL/TLS Termination with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Nginx
- OpenSSL
- SSL/TLS
- HTTPS reverse proxying
- Mutual TLS
- OCSP stapling
- HTTP/2
- testssl.sh

## Sources Consulted
- Podman `network create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `run` official documentation, including volume mount and SELinux relabeling options: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- OpenSSL `req` official documentation: https://docs.openssl.org/3.2/man1/openssl-req/
- Nginx SSL module official documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx HTTP/2 module official documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX release notes covering the HTTP/2 directive change: https://docs.nginx.com/nginx/releases/
- RFC 6125 / RFC 9525 guidance on DNS SANs and wildcard matching: https://www.rfc-editor.org/rfc/rfc6125.html and https://datatracker.ietf.org/doc/html/rfc9525

## Issues Found
- The OpenSSL examples used `-nodes`, which is deprecated in OpenSSL 3.0. Changed both certificate generation commands to use `-noenc`, the documented replacement for writing an unencrypted private key.
- The self-signed certificate SAN list did not include `DNS:localhost`, even though the testing section uses `https://localhost` and says the cert can be trusted to avoid `curl -k`. Added `DNS:localhost` so the hostname matches after trust is configured.
- The wildcard SAN explanation said `*.example.com` covers all subdomains. Updated the wording to clarify that it covers first-level subdomains such as `api.example.com`, not arbitrary nested names.

## Review Notes
Podman was not installed in the local workspace, so Podman CLI behavior was checked against official Podman documentation. OpenSSL commands were executed locally with OpenSSL 3.0.13, and the extracted Nginx TLS configuration was syntax-tested with the current official `nginx:alpine` container image.
