# Validation Summary: How to Set Up BIND as a DNSSEC-Validating Recursive Resolver

## Status
validated

## Post Type
Tutorial / Guide (step-by-step setup and configuration walkthrough)

## Technologies Covered
- BIND 9 (named) — recursive resolver
- DNSSEC (DNSSEC validation, trust anchors, RFC 5011 managed keys)
- DNS tooling: `dig`, `delv`, `rndc`, `named-checkconf`
- Linux service management (systemd, AppArmor, UFW/firewalld/iptables)
- Logging and log rotation (logrotate)
- Response Policy Zones (RPZ), split-horizon views

## Sources Consulted
- BIND 9 Configuration Reference (9.18) — https://bind9.readthedocs.io/en/v9.18.14/reference.html
- ISC KB: Changes to be aware of when moving from BIND 9.16 to 9.18 — https://kb.isc.org/docs/changes-to-be-aware-of-when-moving-from-bind-916-to-918
- ISC KB: Changes to be aware of in BIND 9.20 — https://kb.isc.org/docs/bind-920-changes
- BIND 9.21 / 9.20 Changelogs — https://bind9.readthedocs.io/en/v9.21.0/changelog.html
- BIND DNSSEC Guide (9.18) — https://bind9.readthedocs.io/en/v9.18.13/dnssec-guide.html
- RFC 7646 — Definition and Use of DNSSEC Negative Trust Anchors — https://datatracker.ietf.org/doc/html/rfc7646
- ISC KB: What is rndc nta? — https://kb.isc.org/docs/aa-01418
- DNSSEC validation on BIND named (SIDN) — https://www.sidn.nl/en/modern-internet-standards/dnssec-validation-on-bind-named
- Debian named.conf(5) manpage — https://manpages.debian.org/unstable/bind9/named.conf.5.en.html

## Issues Found

1. **Incorrect "negative trust anchor" config (Issue 3, Option 1).** The post used
   `trust-anchors { "problematic-domain.com" initial-ds 0 0 0 "00"; };` and claimed it
   "temporarily disables validation." This is wrong: `trust-anchors ... initial-ds` *adds* a
   trust anchor, it does not disable validation (and the bogus DS would itself break things).
   Replaced with the correct directive `validate-except { "problematic-domain.com"; };` for a
   permanent exclusion, keeping the `rndc nta` option for temporary exclusion.

2. **`rndc dnssec -status` mislabeled (two places).** The monitoring section and the verification
   commands table described `rndc dnssec -status` as showing "DNSSEC validation statistics." This
   command reports the signing/key-rollover status of an *authoritative* zone using `dnssec-policy`
   and requires a zone argument — it is not a resolver validation-statistics command. Corrected the
   description and the example (`rndc dnssec -status example.com`), and noted that resolver
   validation counters appear in the statistics dump (`rndc stats`).

3. **`fetch-glue` is obsolete.** Removed `fetch-glue yes;`. BIND 9 never fetches glue this way and
   `named-checkconf` flags the option as obsolete.

4. **`resolver-retry-interval` is deprecated/removed.** Removed `resolver-retry-interval 2;` from the
   Issue 5 tuning snippet. It is deprecated in BIND 9.18 and a fatal configuration error in 9.20+.

5. **`random-device` is obsolete in current BIND.** Removed `random-device "/dev/urandom";`. It still
   loads in 9.18 but is an error in 9.20+; entropy is taken from the linked crypto library by default.

6. **`bindkeys-file` is deprecated/removed.** Removed the `bindkeys-file "/etc/bind/bind.keys";` lines
   from both config blocks and the corresponding summary-table row. It is deprecated in 9.18 and
   removed in 9.21 (now a test-only `-T bindkeys=` flag). The built-in trust anchors used by
   `dnssec-validation auto;` make it unnecessary.

7. **Mislabeled comment.** `use-alt-transfer-source no;` was commented as "Query source randomization,"
   which is incorrect — it controls the alternate source address for zone transfers. Comment corrected.

## Review Notes
- The root KSK trust anchor shown (`. initial-key 257 3 8 "AwEAAaz/tAm8...`) is the correct KSK-2017
  (key tag 20326) and the `initial-key` keyword is the current BIND 9.16+ syntax. Left unchanged.
- The example `dig`/`delv` output uses `93.184.216.34` for example.com. This was example.com's
  long-standing address but it changed in 2025. Since these are illustrative sample outputs (not
  commands a reader runs verbatim), they were left as-is, but a future refresh could update them.
- `ntpdate -q pool.ntp.org` is used as a diagnostic; `ntpdate` is deprecated on modern distros
  (chrony/`timedatectl` are the recommended replacements, which the post already shows). Left as a
  harmless illustrative check.
- The `recursion yes;` comment "Disable recursion for non-trusted (defense in depth)" is loosely
  worded but technically fine because recursion is actually restricted via `allow-recursion`. Left as-is.
- Core guidance is accurate: `dnssec-validation auto;`, RFC 5011 managed keys, the `ad` flag check,
  `dnssec-failed.org` as a broken-DNSSEC test, and the SERVFAIL-on-invalid behavior are all correct.
