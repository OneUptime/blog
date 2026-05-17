# Validation Summary: How to Set Up ACME Protocol for Automated Certificate Issuance on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ACME protocol (RFC 8555)
- Let's Encrypt
- Certbot (with nginx, apache, and dns-cloudflare plugins)
- acme.sh
- lego (Go-based ACME client)
- ZeroSSL ACME
- BuyPass ACME
- step-ca (internal CA)
- HTTP-01 and DNS-01 challenges
- systemd timers for renewal
- Renewal hooks (pre, post, deploy)

## Sources Consulted
- Let's Encrypt Rate Limits documentation: https://letsencrypt.org/docs/rate-limits/
- ZeroSSL ACME documentation: https://zerossl.com/documentation/acme/
- lego CLI source code (flags definition): https://github.com/go-acme/lego (master and v5.0.4)
- lego GitHub releases for latest version verification
- Certbot official documentation (general knowledge cross-referenced)
- acme.sh upstream documentation/wiki (general knowledge)
- BuyPass ACME endpoint (https://api.buypass.com/acme/directory)

## Issues Found

1. **Missing `--accept-tos` flag in lego command** — The lego CLI requires the `--accept-tos` (alias `-a`) flag to accept the CA's terms of service when registering a new account. Without it, the certificate issuance command would fail. Verified by inspecting the lego source `cmd/flags.go` and `cmd/internal/flags/names.go` (still present in v5.0.4). Fixed by adding `--accept-tos` to the lego command example.

2. **Missing EAB credentials in the Certbot ZeroSSL example** — ZeroSSL's ACME service requires External Account Binding (EAB) credentials (verified against ZeroSSL's official ACME documentation). The post correctly includes `--eab-kid` and `--eab-hmac-key` for the acme.sh ZeroSSL example, but omitted them from the Certbot ZeroSSL example, which would have failed in practice. Fixed by adding `--eab-kid` and `--eab-hmac-key` to the Certbot ZeroSSL example, with a brief comment explaining where to generate them.

## Review Notes

- The Let's Encrypt rate limit numbers (50 certificates per registered domain per week, 5 duplicate certificates per week, 5 failed validations per identifier per hour) match the current Let's Encrypt rate-limits documentation.
- The lego version pinned in the post (`v4.15.0`) is older than the current upstream release (`v5.0.4` as of 2026-05-14). The post's command syntax (`--email`, `--dns`, `--domains`, `run`, `--accept-tos`) is still valid in v5, so the version pin is functional but readers may want to use a newer version. Left intentionally unchanged since the version pin itself is not a technical error.
- The Certbot installation uses `apt`, which still works on Ubuntu, though EFF/Certbot officially recommends the snap-based installation for the freshest version. This is a stylistic choice rather than a technical error.
- The ZeroSSL ACME URL (`https://acme.zerossl.com/v2/DV90`) and BuyPass ACME directory URL (`https://api.buypass.com/acme/directory`) are correct.
- The acme.sh default-CA syntax (`acme.sh --set-default-ca --server letsencrypt`) and the note that ZeroSSL is the default since 2021 are accurate.
- Renewal hook directories (`/etc/letsencrypt/renewal-hooks/{pre,post,deploy}/`) match Certbot's documented hook layout.
- `certbot renew --force-renewal` correctly bypasses the default ~30-days-to-expiry renewal threshold.
