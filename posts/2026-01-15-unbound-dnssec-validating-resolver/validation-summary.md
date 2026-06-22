# Validation Summary: How to Configure Unbound as a DNSSEC-Validating Resolver

## Status
validated

## Post Type
Tutorial / infrastructure configuration guide

## Technologies Covered
- Unbound recursive DNS resolver
- DNSSEC validation and root trust anchors
- unbound-anchor and RFC 5011 trust anchor maintenance
- unbound-control monitoring and management
- systemd timers and Linux service management
- DNS-over-TLS forwarding
- Prometheus-style metrics export

## Sources Consulted
- NLnet Labs Unbound documentation: https://unbound.docs.nlnetlabs.nl/
- NLnet Labs `unbound.conf(5)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- NLnet Labs `unbound-anchor(8)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-anchor.html
- NLnet Labs `unbound-control(8)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- IANA DNSSEC Trust Anchors and Rollovers: https://www.iana.org/dnssec/files
- IANA root anchors XML: https://data.iana.org/root-anchors/root-anchors.xml
- ICANN announcement for the KSK-2024 trust anchor: https://www.icann.org/en/announcements/details/icann-publishes-new-dnssec-trust-anchor-to-prepare-for-2026-15-08-2024-en
- Live DNS checks with `dig` against Cloudflare and Google Public DNS for `example.com`, `dnssec-tools.org`, and `dnssec-failed.org`
- Local package metadata for Ubuntu 24.04 Unbound-related packages via `apt-cache policy`

## Issues Found
- Corrected the prerequisite text from `RHEL+` to `RHEL 9+`.
- Updated the root trust anchor discussion to account for KSK-2024 pre-publication and the planned rollover instead of implying the only relevant recent change was the 2018 rotation.
- Corrected the `unbound-anchor` description: it updates via DNS first and can fall back to IANA HTTPS retrieval, rather than always fetching via HTTPS.
- Clarified that the trust anchor file may contain multiple records and that the shown DS record is one of the root trust anchors.
- Corrected the private address comment to say Unbound filters private IP answers from public names, not that it denies queries for those ranges.
- Added ownership of `/var/lib/unbound` itself, not only `root.key`, because RFC 5011 updates need write access for temporary files in the trust-anchor directory.
- Added `+dnssec` to DNSSEC validation checks that rely on the AD flag and RRSIG visibility.
- Removed the unsupported runtime `set_option log-replies: yes` command and noted that `log-replies` should be changed in configuration followed by reload or restart.
- Added `tls-cert-bundle` to the DNS-over-TLS forwarding example so upstream certificates can be authenticated.
- Replaced the nonexistent `val-override` workaround reference with a safer note to investigate DS/DNSKEY/RRSIG chains and use `domain-insecure` only as a deliberate temporary exception.
- Replaced the incorrect trust-anchor status command `unbound-control list_auth_zones`, which lists configured auth zones, with `get_option auto-trust-anchor-file`.
- Corrected the `unbound-control lookup` description so it accurately says it shows the name servers Unbound would use, rather than dumping cached data.
- Clarified the optional chroot example by noting required files must exist inside the chroot.
- Removed an unused variable from the OneUptime health check and added `+dnssec` to the probe.

## Review Notes
The configuration is broadly valid for current Unbound releases, but distro defaults and paths differ. In particular, root hints and CA bundle paths may need adjustment on non-Debian systems, and cache/statistics output can vary by Unbound version and compile-time options.
