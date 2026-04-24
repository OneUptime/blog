# Validation Summary: How to Set Up Let's Encrypt ACME with Traefik for Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Traefik Proxy
- Let's Encrypt / ACME
- HTTP-01 and DNS-01 challenges
- Docker Compose and Docker labels
- Cloudflare DNS API
- Portainer
- OpenSSL

## Sources Consulted
- Traefik Proxy v3.0 ACME documentation: https://doc.traefik.io/traefik/v3.0/https/acme/
- Traefik HTTP TLS routing documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/overview/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt staging environment documentation: https://letsencrypt.org/docs/staging-environment/
- lego Cloudflare DNS provider documentation: https://go-acme.github.io/lego/dns/cloudflare/index.html
- Local OpenSSL CLI help output for `openssl s_client` and `openssl x509`

## Issues Found
- The HTTP-01 section said it works for single domains only. I changed this to non-wildcard certificates, including multi-domain certificates, because HTTP-01 can validate multiple identifiers but not wildcard names.
- The staging resolver comment said there were no rate limits. I corrected this to much higher rate limits, because Let's Encrypt staging still enforces rate limits with substantially higher thresholds than production.
- The production resolver comment used an overly simplified rate-limit shorthand. I updated it to a general statement that aligns with Let's Encrypt production rate-limit documentation.
- The Cloudflare token instructions said only DNS edit permission was needed. I corrected this to require `Zone / Zone / Read` and `Zone / DNS / Edit` for the single-token `CF_DNS_API_TOKEN` flow used by lego and Traefik.
- The renewal section incorrectly said Traefik renews at 60 days remaining. I corrected this to 30 days remaining, matching Traefik's documented renewal behavior for 90-day certificates.
- The testing note described deleting a certificate entry from `acme.json` as a forced renewal. I relabeled this as re-issuance and clarified that Traefik will request the certificate again on restart if the router still needs it.
- The HTTP challenge troubleshooting section said the manual curl test should return only `404`. I corrected this to allow a Traefik HTTP response such as `404` or a redirect, because Traefik's HTTP redirection is compatible with HTTP-01 and Let's Encrypt follows redirects.

## Review Notes
- The post pins `traefik:v3.0`, and the ACME keys and examples were validated against Traefik v3.0 documentation.
- Newer Traefik v3 documentation exposes more granular DNS propagation options, but the `delayBeforeCheck` example used here remains valid for the pinned version.
- The `portainer/portainer-ce:latest` image reference is syntactically valid, but explicit version or LTS tags would be more reproducible for production-oriented guidance.
