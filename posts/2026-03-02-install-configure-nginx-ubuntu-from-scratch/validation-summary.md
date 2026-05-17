# Validation Summary: How to Install and Configure Nginx on Ubuntu from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (web server / reverse proxy)
- Ubuntu (apt package manager, systemd)
- Let's Encrypt / Certbot
- UFW (Uncomplicated Firewall)
- TLS / SSL configuration (TLS 1.2, TLS 1.3, OCSP stapling)
- HTTP/2
- gzip compression

## Sources Consulted
- Nginx official documentation: https://nginx.org/en/docs/
- Nginx install on Ubuntu instructions: https://nginx.org/en/linux_packages.html#Ubuntu
- Ubuntu package archive for nginx (1.24.0 on Ubuntu 24.04 LTS)
- Nginx directives reference: https://nginx.org/en/docs/dirindex.html
- Certbot Nginx plugin docs: https://eff-certbot.readthedocs.io/en/latest/using.html#nginx
- UFW application profiles documentation
- Let's Encrypt documentation: https://letsencrypt.org/docs/

## Issues Found
No technical issues found. All installation commands, package names, directives, file paths, and configuration snippets are accurate:

- `apt install nginx` and the official nginx.org repository setup (signed-by keyring approach) match the current Nginx packaging instructions.
- The `nginx -v` example output (`nginx/1.24.0 (Ubuntu)`) matches what Ubuntu 24.04 LTS ships.
- All `systemctl` and `nginx -s` subcommands (`reload`, `quit`, `-t`, `-T`) are valid.
- Configuration directives in `nginx.conf` (`worker_processes`, `worker_rlimit_nofile`, `worker_connections`, `multi_accept`, `use epoll`, `sendfile`, `tcp_nopush`, `tcp_nodelay`, `keepalive_timeout`, `keepalive_requests`, `gzip`, `gzip_types`, `gzip_min_length`, `server_tokens`) are all correct.
- Virtual host syntax including `try_files`, regex location blocks (`location ~ /\.`), and the sites-available/sites-enabled symlink pattern is correct.
- `certbot --nginx -d ...` and the `python3-certbot-nginx` package name are correct.
- TLS configuration (`ssl_protocols TLSv1.2 TLSv1.3`, `ssl_prefer_server_ciphers off`, cipher suite list, session cache, OCSP stapling, HSTS, X-Frame-Options, X-Content-Type-Options) is current best practice.
- UFW `Nginx Full` application profile name is correct.
- Reverse proxy directives (`proxy_pass`, `proxy_set_header`, `X-Forwarded-For`, `X-Forwarded-Proto`, timeouts) are valid.
- `stub_status` module is built into Ubuntu's nginx package by default.

## Review Notes
- The `listen 443 ssl http2;` syntax shown in the manual HTTPS section is valid for the Nginx 1.24.0 version that ships with Ubuntu 24.04. Starting in Nginx 1.25.1, this syntax is deprecated in favor of a separate `http2 on;` directive, but the legacy syntax continues to work. Readers who install from `nginx.org`'s mainline branch may see a deprecation warning.
- The OCSP stapling configuration (`ssl_stapling on; ssl_stapling_verify on;`) typically also needs a `resolver` directive so Nginx can look up the OCSP responder URL from the certificate. This is a common nuance but not strictly an error in the example.
- The reverse proxy example does not include `proxy_http_version 1.1`, `Upgrade`, or `Connection` headers required for WebSocket upgrade. This is fine for the generic HTTP proxy use case shown but worth noting if the reader extends it for WebSockets.
- Minor wording: the comment "Log file for nginx master process" next to the global `error_log` directive could more accurately read "Global error log" — the directive applies to the whole server, not only the master.
