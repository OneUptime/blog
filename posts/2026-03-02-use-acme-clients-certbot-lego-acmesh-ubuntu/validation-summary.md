# Validation Summary: How to Use ACME Clients (Certbot, Lego, acme.sh) on Ubuntu

## Status
validated

## Post Type
Tutorial / Comparative Guide

## Technologies Covered
- ACME protocol (RFC 8555)
- Let's Encrypt
- Certbot (EFF ACME client, Python)
- Lego (Go-based ACME client by go-acme)
- acme.sh (Bash-based ACME client by acmesh-official)
- Cloudflare DNS API
- AWS Route 53 DNS API
- systemd units and timers
- OpenSSL (for cert inspection)
- Ubuntu apt and snap package managers

## Sources Consulted
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot snap install (Let's Encrypt): https://certbot.eff.org/instructions
- Certbot Cloudflare plugin: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- Lego documentation: https://go-acme.github.io/lego/
- Lego Cloudflare DNS provider: https://go-acme.github.io/lego/dns/cloudflare/
- Lego GitHub releases: https://github.com/go-acme/lego/releases
- acme.sh GitHub repository and source: https://github.com/acmesh-official/acme.sh
- acme.sh DNS API wiki: https://github.com/acmesh-official/acme.sh/wiki/dnsapi
- systemd.timer(5) man page

## Issues Found
1. **Invalid acme.sh flag `--list-dns-providers`** — The post originally suggested running `~/.acme.sh/acme.sh --list-dns-providers 2>/dev/null | head -20` to list supported DNS providers. acme.sh has no such CLI option (verified against the source and the project documentation; the wiki and several community references all recommend listing the `dnsapi` directory). Replaced with `ls ~/.acme.sh/dnsapi/ | head -20`, which is the canonical way to discover providers shipped with the installed acme.sh.

## Review Notes
- Lego version `4.14.2` shown in the install snippet is an older release (Oct 2023). The post explicitly templates `LEGO_VERSION` so readers can substitute the latest version themselves, so this is not corrected — but readers should consult the lego releases page for the current tag.
- Certbot accepts flexible flag ordering, so both `certbot certonly --nginx` and `certbot --nginx certonly` work; the post uses both styles.
- For Cloudflare DNS with lego, both `CF_DNS_API_TOKEN` and the alias `CLOUDFLARE_DNS_API_TOKEN` are accepted; the post uses the shorter name, which is correct.
- For acme.sh + Cloudflare token auth, `CF_Token` and `CF_Account_ID` are correct (a `CF_Zone_ID` is also supported but optional).
- When passing multiple `-d` flags to certbot, the first `-d` becomes the cert lineage name unless `--cert-name` is provided. The wildcard examples use `-d "*.example.com" -d example.com`, which results in a lineage directory like `/etc/letsencrypt/live/example.com-0001/` or similar depending on existing certs — not a blocker, but readers may prefer to add `--cert-name example.com` explicitly.
- The bash `date -d "$EXPIRY"` expiry calculation at the end is correct for GNU date on Ubuntu.
