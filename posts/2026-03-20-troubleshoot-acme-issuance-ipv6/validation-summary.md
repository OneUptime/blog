# Validation Summary: How to Troubleshoot ACME Certificate Issuance over IPv6

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- ACME
- IPv6
- Let's Encrypt
- Certbot
- HTTP-01 and DNS-01 challenges
- DNS A, AAAA, CAA, and TXT records
- Nginx
- Linux networking tools: curl, dig, ss, nmap, ip6tables
- Let's Debug

## Sources Consulted
- Let's Encrypt IPv6 Support: https://letsencrypt.org/docs/ipv6-support/
- Let's Encrypt Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt CAA documentation: https://letsencrypt.org/docs/caa/
- Let's Encrypt Staging Environment: https://letsencrypt.org/docs/staging-environment/
- Let's Encrypt Rate Limits: https://letsencrypt.org/docs/rate-limits/
- Certbot User Guide and command-line options: https://eff-certbot.readthedocs.io/en/stable/using.html
- certbot-dns-cloudflare plugin documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- RFC 8555, Automatic Certificate Management Environment (ACME): https://www.rfc-editor.org/rfc/rfc8555
- Nginx listen directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nmap IPv6 scanning documentation: https://nmap.org/book/port-scanning-ipv6.html
- Let's Debug API documentation: https://github.com/letsdebug/letsdebug#web-api-usage
- Local command help output for curl, dig, ss, ip, ip6tables, and jq

## Issues Found
- The CAA check only queried the exact hostname. Added a parent-domain CAA query and clarified that applicable CAA records on the name or parent domain must allow `letsencrypt.org`, matching Let's Encrypt's documented CAA lookup behavior.
- The IPv6 listening check used a broad `ss | grep ':80'` pattern that could match IPv4 listeners. Replaced it with `sudo ss -tlnp 'sport = :80'` and added guidance to look for `[::]:80` or a specific IPv6 listener.
- The manual HTTP-01 challenge simulation wrote into `/.well-known/acme-challenge` without ensuring the directory existed. Added `sudo mkdir -p`.
- The Certbot verbose example described "maximum verbosity" but used only one `--verbose`. Updated it to high verbosity with `-vvv` and made the log grep case-insensitive for IPv6-related messages.
- The DNS-01 Cloudflare example used an ellipsis and omitted the required credentials option. Replaced it with a complete representative command using `--dns-cloudflare-credentials`, `--dns-cloudflare-propagation-seconds`, and `-d`.
- The rate-limit dry-run example used an ellipsis. Replaced it with a concrete webroot dry-run command.
- The staging guidance mentioned `--no-staging`, which is not listed in current Certbot options. Corrected it to remove `--staging` for production.
- The Let's Debug API example posted to an invalid endpoint. Replaced it with the documented JSON API flow: submit a test to `https://letsdebug.net`, capture the returned ID, then fetch the JSON result.

## Review Notes
The guide is technically sound after the fixes. Future improvements could mention that HTTP-01 uses port 80, while port 443 only matters for HTTPS redirects or TLS-ALPN-01, and that firewall commands should be adapted to the host's firewall manager for persistent rules.
