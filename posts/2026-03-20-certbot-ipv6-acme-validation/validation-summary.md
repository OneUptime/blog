# Validation Summary: How to Configure certbot for IPv6 ACME Validation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Certbot
- ACME / Let's Encrypt
- IPv6
- HTTP-01 and DNS-01 challenges
- Nginx
- Amazon Route 53

## Sources Consulted
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot Introduction: https://eff-certbot.readthedocs.io/en/stable/intro.html
- certbot-dns-route53 documentation: https://certbot-dns-route53.readthedocs.io/en/stable/
- Let's Encrypt Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt IPv6 Support: https://letsencrypt.org/docs/ipv6-support/
- RFC 8555 (ACME): https://www.rfc-editor.org/rfc/rfc8555.html

## Issues Found
- The post described Certbot as the "official Let's Encrypt client." I changed this to a neutral description because Certbot's own documentation describes it as an EFF client for obtaining Let's Encrypt certificates, not an official Let's Encrypt client.
- The ACME validation overview implied the AAAA record, port 80, and listener requirements applied to DNS-01 as well as HTTP-01. I narrowed that explanation to HTTP-01 over IPv6, which is the case those requirements actually describe.
- The standalone mode section implied Certbot had no direct way to control IPv6 binding. I corrected it to match Certbot's documented behavior and added the supported `--http-01-address` example for explicit IPv6 binding.
- The IPv4/IPv6 preference section said Let's Encrypt "may try both" addresses and suggested forcing behavior with DNS or hooks. I corrected this to match Let's Encrypt's IPv6 support docs: HTTP-01 prefers IPv6 first when AAAA exists, retries IPv4 only on timeouts, and there is no flag to make Let's Encrypt prefer IPv4.
- The Route53 plugin example used `pip install certbot-dns-route53`, which is not a reliable universal install method for modern Certbot deployments. I replaced it with an instruction to use the install method recommended for the active Certbot packaging.
- The AWS credentials example wrote to the calling user's `~/.aws/credentials` while the Certbot command used `sudo`. I changed it to `/root/.aws/credentials` and added secure permissions because the plugin docs note that `sudo` picks up credentials from root's home.
- The renewal hook example wrote into `/etc/letsencrypt/...` without `sudo`. I corrected it to use `sudo tee` and `sudo chmod` so the commands work on a typical Certbot installation.

## Review Notes
- The Nginx `webroot` example is technically consistent: `root /var/www/certbot;` maps `/.well-known/acme-challenge/...` to `/var/www/certbot/.well-known/acme-challenge/...`.
- For IPv6-only hosts, HTTP-01 can still work if port 80 is reachable over IPv6; DNS-01 is simply a good option when you want to avoid inbound HTTP dependencies.
- Let's Encrypt's public IPv6 support page is older than the other sources, last updated February 7, 2020, but it remains the authoritative public explanation of their IPv6 validation behavior.
