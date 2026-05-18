# Validation Summary: How to Set Up HAProxy with Let's Encrypt on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy (load balancer / reverse proxy)
- Let's Encrypt (ACME certificate authority)
- Certbot (ACME client)
- Ubuntu (apt, systemd, ufw)
- OpenSSL (cert inspection)
- testssl.sh (TLS scanning)
- Python `http.server` (helper for webroot ACME)

## Sources Consulted
- HAProxy SSL/TLS configuration documentation — https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/
- HAProxy 1.5 configuration manual (for `crt` directory loading) — https://www.haproxy.org/download/1.5/doc/configuration.txt
- HAProxy HTTP health checks tutorial — https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy HTTP redirects tutorial — https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/http-redirects/
- Certbot User Guide (renewal hooks) — https://eff-certbot.readthedocs.io/en/stable/using.html
- EFF Certbot install instructions for Ubuntu — https://certbot.eff.org/instructions
- Ubuntu jammy `testssl.sh` package filelist — https://packages.ubuntu.com/jammy/amd64/testssl.sh/filelist
- Python 3 `http.server` documentation — https://docs.python.org/3/library/http.server.html

## Issues Found

1. **Out-of-order commands in "Combining Certificates for HAProxy"** — The `cat ... > /etc/haproxy/certs/example.com.pem` command was issued before `mkdir -p /etc/haproxy/certs`, so the redirect would fail with "No such file or directory" on a fresh install. Moved the `mkdir -p` to run first, then the `cat`, then the permission/ownership commands.

2. **Incorrect version claim for directory-based cert loading** — The post said "Reference the directory in HAProxy (HAProxy 2.0+)". Loading certificates from a directory via the `crt` bind option has been supported since HAProxy 1.5 (confirmed in the 1.5 configuration manual). Changed to "supported since HAProxy 1.5".

## Review Notes

- The `testssl` command (without the `.sh` extension) used in the post is correct for the Ubuntu `testssl.sh` apt package — the package name is `testssl.sh` but the installed binary at `/usr/bin/testssl` has no extension.
- The `option httpchk` + `http-check send meth GET uri /health` split-directive syntax used in the config is the modern HAProxy 2.2+ form, which is appropriate for current Ubuntu LTS (24.04 ships HAProxy 2.8).
- The `prefer-client-ciphers` bind option is valid; note it is not allowed in `ssl-default-server-options` (which the post correctly avoids).
- The post mentions `certbot.timer` for systemd renewal — this is correct for the apt-installed Certbot. Users following EFF's currently recommended snap install path would instead see `snap.certbot.renew.timer`. The post explicitly installs via apt, so this is consistent.
- PEM concatenation order (fullchain + privkey) is conventional and works; HAProxy actually parses by PEM block type, so order is not strictly enforced. The post's wording is fine for a beginner audience.
- The Method 2 webroot section silently assumes the reader will reload HAProxy after editing `haproxy.cfg` before running certbot. An explicit `sudo systemctl reload haproxy` would make the flow safer, but this is a stylistic/clarity improvement rather than a technical error.
- Using a backgrounded `python3 -m http.server` as the ACME challenge backend is functional (the `--directory` flag has been available since Python 3.7, which predates all currently-supported Ubuntu LTS releases) but unusual; production users typically have nginx/apache or use certbot's standalone mode. Left as-is since it is technically correct.
