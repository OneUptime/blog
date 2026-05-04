# Validation Summary: How to Configure Portainer to Use HTTPS Only

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer CE (Community Edition)
- Docker / Docker Compose
- Nginx (as a reverse proxy)
- TLS / HTTPS / HSTS

## Sources Consulted
- [Portainer CLI Reference](https://docs.portainer.io/advanced/cli)
- [Portainer GitHub Issue: Make Portainer HTTPS by default (#5462)](https://github.com/portainer/portainer/issues/5462)
- [Portainer Documentation - Updating on Docker Standalone](https://docs.portainer.io/start/upgrade/docker)
- Nginx official documentation (ssl_protocols, ssl_ciphers, HSTS directives)

## Issues Found
- **Invalid `--ssl` flag**: Method 2 and Method 4 both used a `--ssl` command-line flag that does not exist in the Portainer CLI. Per the official Portainer CLI reference, only `--sslcert` and `--sslkey` are valid SSL-related serving flags; there is no standalone `--ssl` flag. Replaced `--ssl` with `--http-disabled`, which is the correct, documented flag for forcing Portainer to serve only on HTTPS (refusing connections on port 9000 even when mapped). Updated the section heading from "Use the --ssl Flag with Custom Certificates" to "Use --http-disabled with Custom Certificates" and added a one-line explanation of what `--http-disabled` does so the section remains coherent.

## Review Notes
- The default port behavior table is accurate: in Portainer CE 2.9+, both HTTP (9000) and HTTPS (9443) listeners are active by default; HTTP is only reachable from outside if its port is published with `-p 9000:9000`. The `--http-disabled` flag is the official way to disable the HTTP listener entirely.
- Method 1 (omitting `-p 9000:9000`) is a valid network-level approach but does not stop the HTTP listener inside the container — combining it with `--http-disabled` is more defensive.
- Nginx `proxy_pass https://localhost:9443` with `proxy_ssl_verify off` is correct for proxying to Portainer's self-signed cert. The TLS configuration (TLSv1.2/1.3, HIGH:!aNULL:!MD5, HSTS) is reasonable, though `ssl_ciphers HIGH:!aNULL:!MD5` is a coarse default — operators may want a Mozilla-recommended cipher list for stricter posture.
- `version: "3.8"` in Docker Compose still works but is treated as informational by modern Compose; the field is no longer required.
- The verification step uses `curl -k` to bypass cert verification, which is appropriate for local self-signed setups.
