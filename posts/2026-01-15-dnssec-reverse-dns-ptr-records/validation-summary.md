# Validation Summary: How to Set Up DNSSEC for Reverse DNS (PTR Records)

## Status
validated

## Post Type
Tutorial / Step-by-step guide (operational how-to for signing reverse DNS zones with DNSSEC on BIND and PowerDNS)

## Technologies Covered
- DNSSEC (KSK/ZSK, DS records, RRSIG, NSEC3, DNSKEY)
- Reverse DNS / PTR records (`in-addr.arpa` and `ip6.arpa`)
- BIND 9 (`named`, `dnssec-keygen`, `dnssec-signzone`, `dnssec-dsfromkey`, `dnssec-settime`, `dnssec-policy`, `rndc`, `delv`, `dig`)
- PowerDNS (`pdnsutil`, gpgsql backend)
- RIR/registry DS submission (RIPE, ARIN, cloud providers)
- Monitoring (Nagios/Icinga, Prometheus)

## Sources Consulted
- RFC 4034 — Resource Records for the DNS Security Extensions (RRSIG Labels field definition): https://www.rfc-editor.org/rfc/rfc4034.html
- ISC KB — "Disable dnssec-lookaside (DLV) now": https://kb.isc.org/docs/disable-dnssec-lookaside-dlv-now-heres-how
- BIND 9.16.0 release information (removal of DLV functionality): https://www.ddiguru.com/blog/bind-9-16-release-info
- ISC KB — "DNSSEC Key and Signing Policy" (dnssec-policy grammar / option list): https://kb.isc.org/docs/dnssec-key-and-signing-policy
- Tony Finch — "BIND9 dnssec-policy appendices" (timing option names): https://dotat.at/@/2024-05-12-dnssec-policy.html
- BIND 9.18 ARM / DNSSEC Guide: https://bind9.readthedocs.io/en/v9.18.14/dnssec-guide.html
- RFC 9276 — Guidance for NSEC3 Parameter Settings (best-practice review note)

## Issues Found

1. **Obsolete `dnssec-lookaside auto;` directive (Step 4 options block).**
   DNSSEC Lookaside Validation (DLV) was deprecated in BIND 9.16 (the option is
   ignored with a warning) and removed entirely in 9.18 — configuring it on a
   modern BIND (which the post targets, BIND 9.16+) is incorrect and can cause
   config-load failures. **Removed the line**, leaving `dnssec-validation auto;`.

2. **Invalid `parent-registration-delay P1D;` option in the `dnssec-policy` block (Step 7).**
   This is not a recognized `dnssec-policy` statement. The valid parent-timing
   options are `parent-ds-ttl` and `parent-propagation-delay` only (verified
   against the ISC KB option list and the dnssec-policy appendix). Leaving it in
   would make `named-checkconf` reject the configuration. **Removed the line.**

3. **Incorrect RRSIG `labels` field values in the example signed-zone output and
   the `delv` output.** Per RFC 4034 §3.1.3 the Labels field equals the number of
   labels in the RRSIG owner name (the root label is not counted). The apex name
   `2.0.192.in-addr.arpa.` has 5 labels (post showed `4`) and the PTR owner
   `10.2.0.192.in-addr.arpa.` has 6 labels (post showed `5`). **Corrected** the
   SOA/NS/DNSKEY RRSIGs from `13 4` to `13 5` and the PTR RRSIGs from `13 5` to
   `13 6` (both in the signed-zone listing and the `delv` expected output).

## Review Notes

The post is otherwise technically sound. Verified as correct: the reverse-zone
naming for IPv4 (`2.0.192.in-addr.arpa`) and IPv6 (`8.b.d.0.1.0.0.2.ip6.arpa`),
the 24-nibble relative PTR labels for `2001:db8::1`, the `dnssec-keygen`/
`dnssec-signzone`/`dnssec-dsfromkey` syntax and flags (`-A` opt-out NSEC3, `-3`
salt, `-N INCREMENT`, `-o`, `-t`, `-K`, `-2` SHA-256 digest), the algorithm/ID
table (8, 10, 13, 14, 15, 16), the DS record field breakdown, the PowerDNS
`pdnsutil` command set, and the `dnssec-policy` keys/signature grammar.

Non-blocking items worth a future revision (left as-is, functional but
improvable):

- **NSEC3 iterations.** The post uses `iterations 10` (BIND `dnssec-policy`
  `nsec3param`) and `'1 0 10 abcd'` (PowerDNS `set-nsec3`). RFC 9276 (2022) now
  recommends **0 iterations and an empty salt**; many validators treat higher
  iteration counts as insecure, and BIND's built-in default policy uses 0.
  Consider updating to `iterations 0 ... salt-length 0`.

- **Step 4 mixes manual and automatic signing.** The zone blocks point `file` at
  the manually-produced `.signed` file while also enabling
  `auto-dnssec maintain; inline-signing yes;`. With inline signing, `file` should
  reference the *unsigned* source zone (as correctly shown in Step 7); pointing
  it at an already-signed file leads to double-signing. The two approaches
  (manual `dnssec-signzone` vs. `auto-dnssec`/`dnssec-policy`) are best presented
  as mutually exclusive.

- **`auto-dnssec`** is deprecated in favor of `dnssec-policy` in modern BIND
  (9.16+) and is being phased out; the post does introduce `dnssec-policy` as the
  newer method, which is good.

- `dnssec-validation auto;` is a resolver/validation setting and is functionally
  irrelevant (though harmless) on a purely authoritative master server.
