# Validation Summary: How to Implement DANE (DNS-Based Authentication of Named Entities) with DNSSEC

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- DANE (DNS-Based Authentication of Named Entities, RFC 6698 / RFC 7671 / RFC 7672)
- DNSSEC
- TLSA DNS records
- TLS / X.509 certificates, SPKI hashing
- OpenSSL (s_client, x509, pkey, dgst)
- ldns / ldns-dane (ldnsutils)
- hash-slinger (`tlsa` command)
- GnuTLS `danetool`
- BIND 9, PowerDNS DNSSEC signing
- Postfix and Exim DANE/SMTP configuration
- Let's Encrypt / acme.sh
- Nginx, Apache TLS configuration
- Cloudflare / AWS Route 53 DNS APIs
- Prometheus / Alertmanager monitoring

## Sources Consulted
- RFC 6698 (The DNS-Based Authentication of Named Entities (DANE) TLS Protocol: TLSA) — usage/selector/matching-type field semantics
- RFC 7672 (SMTP Security via Opportunistic DANE TLS)
- ldns-dane(1) manpage — https://manpages.debian.org/testing/ldnsutils/ldns-dane.1.en.html
- hash-slinger `tlsa`(1) manpage — https://manpages.debian.org/testing/hash-slinger/tlsa.1.en.html and https://github.com/letoams/hash-slinger
- GnuTLS danetool invocation docs — https://www.gnutls.org/manual/html_node/danetool-Invocation.html
- acme.sh README and issue tracker — https://github.com/acmesh-official/acme.sh (incl. issue #6566 re: `--reuse-key`)
- Postfix TLS_README — https://www.postfix.org/TLS_README.html (TLS policy map parent-domain matching)
- Postfix postconf(5) — smtp_tls_security_level, smtp_dns_support_level

## Issues Found
1. **`ldns-dane` invalid `tcp` positional argument (3 occurrences).** The post used `ldns-dane create www.example.com 443 tcp` and `ldns-dane verify www.example.com 443 tcp` (including inside `dane-health-check.sh`). Per the ldns-dane(1) manpage the synopsis is `ldns-dane [OPTIONS] create|verify name port` — there is no protocol positional argument (ldns-dane is TCP/TLS only). The 4th positional in `create` is actually the certificate-usage value, so passing `tcp` is invalid. Removed `tcp` from all three commands.
2. **hash-slinger `tlsa` invalid `--host` flag (2 occurrences).** The post used `tlsa --create ... --host www.example.com`. The `tlsa` command takes the hostname as a trailing positional argument, not via a `--host` option. Changed `--host www.example.com` to a positional `www.example.com` in both examples.
3. **acme.sh non-existent `--reuse-key` flag.** The post passed `--reuse-key` to `acme.sh --issue`. acme.sh does not have a `--reuse-key` option (unlike certbot); it reuses the same private key on renewal by default, which is exactly the behavior needed for stable DANE SPKI pinning. Removed the flag and updated the comment to state that acme.sh reuses the key by default.

## Review Notes
- TLSA field tables (usage 0–3, selector 0–1, matching type 0–2) are correct per RFC 6698, as are the DANE-EE / SPKI / SHA-256 recommendations.
- The OpenSSL SPKI-hash pipelines (`x509 -pubkey -noout | pkey -pubin -outform DER | dgst -sha256 -binary | xxd -p`) are correct and current.
- `danetool` examples (`--check`, `--tlsa-rr --host --port`) are valid: `--host` IS a real danetool option (this differs from hash-slinger's `tlsa`, which is why only the latter was corrected).
- The Postfix `smtp_tls_policy_maps` file uses a bare `.` catch-all entry. Postfix performs recursive parent-domain matching (leading-dot) on policy table lookups, so this is a reasonable representation of a default fallback and was left as-is; operators typically also rely on the global `smtp_tls_security_level` as the true default.
- In the "Key Reuse Strategy" example, the `openssl ecparam -genkey` line generates a key file that `acme.sh --issue` does not actually consume (acme.sh manages its own key); the surrounding point — that the key is reused across renewals so the SPKI TLSA record stays stable — is correct. Left unchanged as it is illustrative rather than a broken command.
- DNSSEC signing commands for BIND (`dnssec-keygen`, `dnssec-signzone`) and PowerDNS (`pdnsutil secure-zone`, `show-zone`, `activate-tsig-key`) are valid; note BIND's `auto-dnssec`/`inline-signing` approach shown is the legacy style and modern BIND 9.16+ prefers `dnssec-policy`, but the shown directives still function.
- Provider support tables (browser, email, DNS) are point-in-time claims ("as of 2026") and are plausible/reasonable but inherently time-sensitive.
