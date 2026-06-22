# Validation Summary: How to Monitor DNSSEC Expiry and Prevent Outages

## Status
validated

## Post Type
Tutorial / Guide (DNSSEC expiry monitoring with shell, Python, Node.js, Prometheus/Grafana, and OneUptime integration)

## Technologies Covered
- DNSSEC (RRSIG, DNSKEY, DS, NSEC/NSEC3, KSK/ZSK)
- `dig` and `delv` (BIND DNS utilities)
- Bash scripting
- Python 3 (subprocess, dataclasses, argparse, prometheus_client)
- Node.js (child_process)
- Prometheus and Grafana
- Cron / alerting (Slack, email, OneUptime webhooks)

## Sources Consulted
- RFC 4034 (Resource Records for the DNS Security Extensions — RRSIG/DNSKEY/DS RDATA formats and field ordering) — https://datatracker.ietf.org/doc/html/rfc4034
- RFC 4035 (Protocol Modifications for DNSSEC — AD/CD flag semantics) — https://datatracker.ietf.org/doc/html/rfc4035
- IANA DNSSEC Algorithm Numbers registry — https://www.iana.org/assignments/dns-sec-alg-numbers/
- BIND 9 `dig` / `delv` documentation and release notes (removal of `+sigchase` / `+trusted-key` in BIND 9.12) — https://bind9.readthedocs.io/
- RFC 8080 (Ed25519/Ed448 for DNSSEC — key sizes) — https://datatracker.ietf.org/doc/html/rfc8080
- prometheus_client Python docs — https://github.com/prometheus/client_python

## Issues Found
1. **`dig +sigchase` / `+trusted-key` (basic shell script).** These options were removed from BIND's `dig` (as of BIND 9.12, 2017); `delv` is the official replacement. The fallback also used `dig +dnssec +cd`, but `+cd` (Checking Disabled) instructs the resolver *not* to validate, so it would not actually validate the chain. Replaced with `delv "$DOMAIN" A` and a `dig +dnssec "$DOMAIN" A` fallback (without `+cd`).
2. **Python `validate_chain` fallback used `dig +dnssec +cd`.** It then inspected the `AD` (Authenticated Data) flag — but `+cd` prevents the resolver from validating, so the `AD` flag is never set, making the check contradictory. Removed `+cd` so the `AD` flag is meaningful, and added a clarifying comment.
3. **Node.js `validateChain` passed `+sigchase` to `dig`.** Since `+sigchase` no longer exists in modern `dig`, the call would fail and the function would always return `false`. Changed it to a plain query (`runDig` already adds `+dnssec`) and check for the `AD` flag in the response header.

## Review Notes
- The DNSSEC fundamentals are accurate: KSK/ZSK roles, DNSKEY flags (256=ZSK, 257=KSK/SEP), DS as a hash of the KSK in the parent zone, and RRSIG inception/expiration semantics.
- IANA DNSSEC algorithm numbers used throughout (3 DSA/SHA-1, 5 RSA/SHA-1, 7 RSASHA1-NSEC3-SHA1, 8 RSA/SHA-256, 10 RSA/SHA-512, 13 ECDSA P-256, 14 ECDSA P-384, 15 Ed25519, 16 Ed448) are correct, as are the listed key lengths (ECDSA P-256=256, P-384=384, Ed25519=256, Ed448=456 bits).
- RRSIG RDATA field positions parsed in the shell script (`awk '{print $9}'` for expiration, `$10` for inception in non-multiline output) and the Python/Node regexes for `+multiline` output are correct per RFC 4034.
- The `diagnose-servfail.sh` use of `dig +cd` is correct and properly described as querying with validation disabled (to distinguish DNSSEC failures from other SERVFAILs).
- Minor (not changed, illustrative only): the DNSViz API path and OneUptime webhook/endpoint payloads are presented as examples and should be adapted to the actual API in use. The Python exporter imports `Info` from prometheus_client without using it — harmless.
- `delv +rtrace` and its "fully validated" output string used in the Python primary path are correct for modern BIND.
