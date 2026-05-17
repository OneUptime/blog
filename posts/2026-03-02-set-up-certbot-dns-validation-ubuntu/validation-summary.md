# Validation Summary: How to Set Up Certbot with DNS Validation on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Certbot (snap and apt installations)
- Let's Encrypt (ACME DNS-01 challenge)
- Cloudflare DNS plugin (certbot-dns-cloudflare)
- AWS Route53 DNS plugin (certbot-dns-route53)
- DigitalOcean DNS plugin (certbot-dns-digitalocean)
- Nginx (TLS configuration)
- systemd timers (automatic renewal)
- dig / nslookup (DNS TXT verification)
- Ubuntu (apt, snap package managers)

## Sources Consulted
- Certbot EFF installation instructions: https://certbot.eff.org/instructions?ws=nginx&os=snap
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- certbot-dns-cloudflare docs: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- certbot-dns-route53 docs: https://certbot-dns-route53.readthedocs.io/en/stable/
- certbot-dns-digitalocean docs: https://certbot-dns-digitalocean.readthedocs.io/en/stable/
- Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/
- Certbot PPA (deprecation): https://launchpad.net/~certbot/+archive/ubuntu/certbot

## Issues Found
1. **Missing `trust-plugin-with-root=ok` step for snap DNS plugins.** When DNS plugins are installed via snap, they cannot read root-owned credential files (such as `/etc/letsencrypt/cloudflare.ini` which the post correctly chmods to 600) without running `sudo snap set certbot trust-plugin-with-root=ok`. Added this command to the Cloudflare, Route53, and DigitalOcean installation snippets.
2. **Misleading "Or via pip" comments.** The Cloudflare and DigitalOcean sections had comments saying "Or via pip if using apt certbot" preceding `apt install python3-certbot-dns-*` commands — the command uses apt, not pip. Updated the comment to correctly reference apt.
3. **Deprecated `ppa:certbot/certbot` PPA.** The PPA has not been updated since late 2020 and the project recommends snap. Replaced the PPA installation steps with a straightforward `sudo apt install certbot` from Ubuntu's standard repository (noting it ships an older version).

## Review Notes
- The "5 duplicate certificates per week" rate-limit terminology is legacy. Let's Encrypt now calls this limit "New Certificates per Exact Set of Identifiers" — the value (5 / 7-day rolling window) is unchanged, so the post's numeric guidance is still accurate. Left the wording as-is since the practical guidance is correct.
- The Route53 IAM policy lists the minimum required permissions correctly. Some users may also want `route53:ListResourceRecordSets` for debugging, but it isn't strictly required by the plugin.
- The post recommends Ubuntu's snap-shipped certbot, which is current best practice per EFF.
- `ssl_stapling on;` in the Nginx snippet works with Let's Encrypt certificates as written; no resolver directive is configured, which is fine for modern nginx versions but some setups may want to add a `resolver` line — left alone since it's a stylistic choice, not an error.
- The Cloudflare plugin's `--dns-cloudflare-propagation-seconds` default of 10 was verified against the upstream docs.
