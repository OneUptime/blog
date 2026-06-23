# Validation Summary: How to Generate DNSSEC Keys (KSK and ZSK) with dnssec-keygen

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNSSEC
- BIND 9 DNS utilities (`dnssec-keygen`, `dnssec-settime`, `dnssec-dsfromkey`, `dnssec-signzone`, `named-checkconf`/`named-checkzone`)
- DNSSEC algorithms (RSASHA256, RSASHA512, ECDSAP256SHA256, ECDSAP384SHA384, ED25519, ED448)
- Key Signing Keys (KSK) and Zone Signing Keys (ZSK)
- Shell scripting (Bash) for key lifecycle automation

## Sources Consulted
- BIND 9 Administrator Reference Manual / man pages — dnssec-keygen options (https://bind9.readthedocs.io/en/latest/manpages.html and v9.18 manpage)
- Fedora Packages — bind-dnssec-utils (https://packages.fedoraproject.org/pkgs/bind/bind-dnssec-utils/)
- RFC 8624 — Algorithm Implementation Requirements and Usage Guidance for DNSSEC (algorithm numbers and recommendation tiers)
- RFC 4034 — Resource Records for DNSSEC (KSK/ZSK flags, DNSKEY/DS record format)

## Issues Found
1. **Fedora/RHEL package name was incomplete.** The Prerequisites section installed only `bind-utils` on RHEL/CentOS/Fedora, but on modern Fedora/RHEL `dnssec-keygen` (and the related DNSSEC tools) live in the separate `bind-dnssec-utils` package — `bind-utils` only provides dig/host/nslookup. Updated the command to `sudo dnf install bind-utils bind-dnssec-utils` with a clarifying comment.
2. **Incorrect flag for the "Created" timing metadata.** The "Timing Options Explained" table listed `-C` as the flag for the key's Created time. In `dnssec-keygen`, `-C` is actually *compatibility mode* (generates an old-style key with no timing metadata). The Created timestamp is set automatically at generation and has no dedicated flag. Changed the table entry to "(automatic) — When the key was created (set automatically at generation)".
3. **Deprecated `-r randomdev` option.** The "Random Number Source" section used `dnssec-keygen ... -r /dev/random`. This flag was removed in modern BIND (9.16+); key generation now obtains entropy from the cryptographic provider (OpenSSL), which uses the OS CSPRNG. Rewrote the section to explain this and removed the non-existent flag from the example.

## Review Notes
- The post recommends 1024-bit RSA for ZSKs "for performance." This is technically permitted by `dnssec-keygen` (RSA keys may be 1024–4096 bits) and the example commands work, so it was left unchanged, but current security best practice (RFC 8624 and operator guidance) favors a 2048-bit minimum for RSA. Readers should prefer ECDSA/EdDSA (which the post also recommends) or RSA ≥ 2048.
- Algorithm numbers (5, 7, 8, 10, 13, 14, 15, 16), KSK/ZSK flag values (257/256), DNSKEY/DS record formats, digest type mappings (SHA-256 = 2, SHA-384 = 4), and key/signature sizes (including Ed448's 456-bit key and 114-byte signature) were all verified correct.
- The illustrative base64 key material and DS digest hex strings are placeholders and not real cryptographic output, which is appropriate for documentation.
- Debian/Ubuntu package names (`bind9-utils`, `bind9-dnsutils`) and the macOS Homebrew `bind` formula are correct.
