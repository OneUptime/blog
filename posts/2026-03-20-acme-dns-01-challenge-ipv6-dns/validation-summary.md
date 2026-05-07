# Validation Summary: How to Configure ACME DNS-01 Challenge with IPv6 DNS Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- ACME / DNS-01
- Let's Encrypt
- Certbot
- Cloudflare DNS API
- AWS Route 53 and IAM
- BIND / `rndc`
- `acme.sh`
- IPv6 DNS resolution
- `dig`

## Sources Consulted
- RFC 8555, Section 8.4 DNS Challenge: https://datatracker.ietf.org/doc/rfc8555/
- Let's Encrypt Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot command reference: https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- `certbot-dns-cloudflare` documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- `certbot-dns-route53` documentation: https://certbot-dns-route53.readthedocs.io/en/stable/
- `acme.sh` upstream README: https://github.com/acmesh-official/acme.sh
- BIND 9 guidance on `rndc reload`: https://kb.isc.org/docs/aa-00640

## Issues Found
- The DNS-01 explanation said no inbound connections were needed. That was too broad for self-hosted authoritative DNS. I changed the wording to the accurate claim: no inbound HTTP access is required for the application server.
- The prerequisites section implied DNS-01 always requires API-driven record creation. That is only true for automated issuance and renewal. I corrected the wording to reflect that manual DNS-01 remains possible.
- The plugin discovery example used `pip3 list` as if it showed available DNS plugins and included `certbot-dns-godaddy`, which is not one of Certbot’s officially documented DNS plugins. I changed the example to `certbot plugins` and replaced the unofficial example with the official `certbot-dns-rfc2136` plugin.
- The Cloudflare credentials snippet used shell redirection without `sudo`, which would fail when writing to `/etc/letsencrypt/secrets/`. I changed it to `sudo tee ... << 'EOF'`.
- The Cloudflare permissions note said Certbot requires `0600` permissions. The official plugin documentation says Certbot warns on unsafe permissions rather than requiring that exact mode, so I corrected the wording.
- The Route 53 IAM example was labeled as `json` but contained a `//` comment, which makes the snippet invalid JSON. I removed the comment.
- The Route 53 example ran `aws configure` but then used `sudo certbot`. The official Route 53 plugin docs state that when running under `sudo`, credentials are read from the root home directory. I changed the example to `sudo aws configure`.
- The BIND zone-file example was fenced as `bash` even though the TXT record line is zone-file syntax, not a shell command. I changed that block to `text`.
- The DNS propagation example claimed to query Let's Encrypt’s DNS servers while actually querying Google and Cloudflare public resolvers. I corrected the comment to describe them accurately as public IPv6 resolvers.
- The `acme.sh` example did not specify a CA. Upstream `acme.sh` currently defaults to ZeroSSL, so the example could issue from a different CA than the rest of the post implies. I added `--server letsencrypt`.

## Review Notes
- Manual Certbot DNS-01 issuance does not support automatic renewal unless paired with `--manual-auth-hook` and related automation hooks.
- Resolver checks with Google or Cloudflare are useful for propagation checks, but Let’s Encrypt notes that anycast can still produce different views of DNS during validation.
- Certbot’s preferred installation method for DNS plugins is OS-specific; `certbot.eff.org` remains the best source for system-specific install instructions.
