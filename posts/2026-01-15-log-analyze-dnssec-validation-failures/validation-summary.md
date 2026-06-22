# Validation Summary: How to Log and Analyze DNSSEC Validation Failures

## Status
validated

## Post Type
Tutorial / Guide (operational how-to with configuration and code examples)

## Technologies Covered
- DNSSEC (DNS Security Extensions)
- BIND 9 (named) logging and DNSSEC validation
- Unbound validating resolver
- PowerDNS Recursor (config + Lua scripting)
- systemd journald
- Bash, awk, grep, dig, delv, drill, unbound-host
- Python 3 (custom log analyzer + dnspython validation tester)
- OpenTelemetry Collector (filelog receiver, processors, exporters)
- Prometheus alerting rules
- Fluent Bit
- logrotate, AWS S3 archival
- OneUptime monitoring integration

## Sources Consulted
- BIND 9 Configuration Reference / logging categories — https://bind9.readthedocs.io/en/stable/reference.html
- BIND 9.16 logging categories list — https://bind9.readthedocs.io/en/v9_16_26/logging-categories.html
- ISC DNSSEC Guide (logging) — https://dnsinstitute.com/documentation/dnssec-guide/ch05s03.html
- BIND 9.20 changes / deprecations — https://kb.isc.org/docs/bind-920-changes
- "Deprecation notice for BIND 9.20+: dnssec-must-be-secure option" — https://www.mail-archive.com/bind-users@lists.isc.org/msg33677.html
- dnspython DNSSEC documentation — https://dnspython.readthedocs.io/en/latest/dnssec.html
- Unbound unbound.conf documentation (val-log-level, log-* options) — https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- PowerDNS Recursor settings and scripting reference — https://doc.powerdns.com/recursor/

## Issues Found
1. **Invalid BIND logging category `dnssec-validation`** (two locations).
   BIND 9 has no `dnssec-validation` logging *category* — all DNSSEC processing,
   including validation, is logged under the single `dnssec` category.
   (`dnssec-validation` exists only as an `options` *statement* for enabling
   validation, which the post also uses correctly.) Routing a non-existent
   category causes `named` to reject the configuration.
   - Fix: In the basic logging block, merged the intent into a valid statement —
     `category dnssec { dnssec_log; validation_log; };` — so both channels still
     receive DNSSEC/validation logs, and removed the bogus
     `category dnssec-validation { validation_log; };` line (with a clarifying
     comment).
   - Fix: In the JSON logging block, removed the duplicate/invalid
     `category dnssec-validation { dnssec_json; };` line.

2. **Non-existent dnspython attribute `resolver.use_dnssec = True`.**
   `dns.resolver.Resolver` has no `use_dnssec` attribute; assigning it silently
   creates an unused attribute and does NOT request DNSSEC records. The correct
   approach is to set the EDNS DO (DNSSEC OK) flag.
   - Fix: Replaced with `self.resolver.use_edns(0, dns.flags.DO, 4096)` and added
     the required `import dns.flags` (the code already relied on `dns.flags.AD`
     later, which was not previously imported).

## Review Notes
- **`dnssec-must-be-secure example.com yes;`** is still valid in current stable
  BIND (9.18 and 9.20) but is **deprecated** — `named-checkconf` emits a warning,
  and it becomes a fatal error in BIND 9.21+. Left as-is since it is functional on
  the versions most operators run today, but readers on 9.21+ should remove it.
- The Python `DNSSECTester` uses `dns.resolver` (a stub resolver), which does not
  itself perform DNSSEC chain validation, so `dns.dnssec.ValidationFailure` will
  not actually be raised by `resolve()`; authentication is instead inferred from
  the AD flag returned by the upstream validating resolver. This is a reasonable
  approach for testing against a validating resolver (e.g. 8.8.8.8) and the AD-flag
  logic is correct; the `bogus` branch is effectively defensive. Not changed.
- `datetime.utcnow()` is deprecated in Python 3.12+ (prefer
  `datetime.now(datetime.UTC)`), but still functions and is widely used. Left as-is.
- BIND `print-time iso8601`, Unbound `val-log-level`/`log-servfail`/
  `log-tag-queryreply`, PowerDNS `structured-logging`/`dnssec-log-bogus`, and the
  PowerDNS Lua `postresolve`/`validationState` API all verified as correct/current.
- The DNSSEC validation-flow explanation, failure-cause list, diagnostic commands
  (`dig +dnssec`, `delv +rtrace`, `drill -DT`, `dig +cd`), and the remediation
  table are all technically accurate.
