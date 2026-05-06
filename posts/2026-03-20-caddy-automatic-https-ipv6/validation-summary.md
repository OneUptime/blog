# Validation Summary: How to Configure Caddy Automatic HTTPS with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Caddy
- Caddyfile
- Caddy JSON config and admin API
- ACME
- Let's Encrypt
- ZeroSSL
- IPv6 networking
- systemd
- OpenSSL and curl

## Sources Consulted
- Caddy docs: Automatic HTTPS: https://caddyserver.com/docs/automatic-https
- Caddy docs: Caddyfile Concepts: https://caddyserver.com/docs/caddyfile/concepts
- Caddy docs: Global options: https://caddyserver.com/docs/caddyfile/options
- Caddy docs: `bind` directive: https://caddyserver.com/docs/caddyfile/directives/bind
- Caddy docs: Install: https://caddyserver.com/docs/install
- Caddy docs: Keep Caddy Running: https://caddyserver.com/docs/running
- Caddy docs: API: https://caddyserver.com/docs/api
- Caddy docs: Command Line: https://caddyserver.com/docs/command-line
- Caddy docs: Build from source: https://caddyserver.com/docs/build
- Let's Encrypt docs: Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt docs: IPv6 Support: https://letsencrypt.org/docs/ipv6-support/
- `caddy-dns/cloudflare` README: https://github.com/caddy-dns/cloudflare

## Issues Found
- The introduction said Caddy obtained Let's Encrypt certificates by default. Current Caddy documentation says Automatic HTTPS enables two public ACME issuers by default, Let's Encrypt and ZeroSSL, so I corrected the wording to describe publicly trusted ACME certificates instead of only Let's Encrypt.
- The Debian/Ubuntu install snippet omitted the documented `chmod o+r` steps for the keyring and repo-list files. I added those commands to match Caddy's current install instructions.
- The IPv6-only example used `http://[::]:80` as if that were the right way to bind a domain site to IPv6 only. Caddy's documented mechanism is the `bind` directive, and its Automatic HTTPS docs note that the runtime-created HTTP listener needs an explicit HTTP site if you want bind behavior there too. I replaced that example with `bind [::]` on `example.com` and `http://example.com`.
- The DNS-01 section incorrectly implied that IPv6-only servers inherently need DNS-01. Let's Encrypt and Caddy both support IPv6 for HTTP-01/TLS-ALPN-01 validation, while wildcard certificates specifically require DNS-01. I changed the explanation accordingly.
- The DNS plugin build step was phrased as though it installed the plugin into the running service. `xcaddy build` produces a custom binary, so I reworded the step and added a note that the resulting binary must actually be used by the service.
- The environment-variable instructions implied that `/etc/caddy/caddy.env` would be loaded automatically. Caddy's systemd documentation instead shows using a drop-in with `Environment=` or `EnvironmentFile=...`, so I corrected the post to the documented systemd override approach.
- The ACME CA section said Let's Encrypt production was the default. Current Caddy docs say the default public issuers are ZeroSSL and Let's Encrypt, and `acme_ca` is for forcing a specific ACME directory. I corrected that explanation.
- The OpenSSL example mixed a literal IPv6 address with `-servername example.com`, which is not a coherent certificate-verification example for the configuration shown. I updated it to test `example.com` over IPv6 with SNI.
- The admin API comment described `/config/` and `/pki/ca/local` as certificate-status endpoints. Those endpoints expose the active config and local CA information, so I corrected the description.

## Review Notes
- The JSON example is technically valid, but the official HTTPS quick-start shows that a host matcher alone is enough to trigger Automatic HTTPS; the post's JSON remains more explicit than necessary.
- The `caddy` binary was not installed in the review environment, so the review was completed against current official documentation rather than by running `caddy validate` locally.
- Local `openssl s_client -help` and `curl --help all` output were used to confirm the `-6` flags in the verification commands.
