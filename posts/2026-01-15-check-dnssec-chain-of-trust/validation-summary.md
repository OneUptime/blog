# Validation Summary: How to Check DNSSEC Chain of Trust from Root to Your Domain

## Status
validated

## Post Type
Tutorial / Guide (hands-on DNSSEC verification with CLI tools)

## Technologies Covered
- DNSSEC (RFC 4033/4034/4035) — KSK, ZSK, DS, RRSIG, DNSKEY, chain of trust
- `dig` (BIND `bind9-dnsutils`/`dnsutils`)
- `delv` (BIND DNSSEC validation utility)
- `drill` (ldns / `ldnsutils`)
- `dnssec-dsfromkey`, `rndc` (BIND tooling)
- DNSSEC algorithm numbers (IANA registry)
- Prometheus alerting, shell/cron automation

## Sources Consulted
- ldns `drill(1)` man page — https://manpages.debian.org/testing/ldnsutils/drill.1.en.html
- BIND `delv(1)` man page — https://manpages.org/delv
- BIND 9 manual pages — https://bind9.readthedocs.io/en/stable/manpages.html
- IANA DNSSEC Algorithm Numbers registry — https://www.iana.org/assignments/dns-sec-alg-numbers/dns-sec-alg-numbers.xhtml
- DNSSEC RFCs 4033/4034/4035

## Issues Found
- **Incorrect `drill` version flag.** The prerequisites section's verification line used `drill -v`. In `drill`, `-v` is the verbosity option (and expects a level argument); the version flag is the uppercase `-V`. Changed `dig -v && delv -v && drill -v` to `dig -v && delv -v && drill -V`. (`dig -v` and `delv -v` are correct for those two tools and were left unchanged.)

## Review Notes
- The entire walkthrough uses `example.com` as an illustrative domain. In reality `example.com` is not DNSSEC-signed, so the sample DNSKEY/DS/RRSIG outputs (and the `93.184.216.34` A record) are representative teaching examples, not live results. This is a standard documentation convention and was left as-is.
- The `.com` DS values shown (`30909 8 2`) and root KSK key tag `20326` are real, widely-documented values consistent throughout the post. Verisign has been migrating `.com`/`.net` toward ECDSA (algorithm 13), so the exact `.com` key tag/algorithm may differ when readers query live; values here remain valid as illustrative examples.
- `dnssec-dsfromkey -2 ksk.key` (and the `dig +short DNSKEY | grep "^257" > ksk.key` recipe) is illustrative: `dnssec-dsfromkey` reads a key/keyset file that includes the owner name, so a raw `dig +short` capture may need the owner name prepended depending on tool version. Left unchanged as it conveys the correct intent.
- `ntpdate` is deprecated on many modern distributions (replaced by `chronyc`/`timedatectl`) but remains widely available; acceptable as a quick clock-check example.
- DNSSEC algorithm reference table matches the IANA registry (RSA/SHA-256=8, RSA/SHA-512=10, ECDSA P-256=13, ECDSA P-384=14, Ed25519=15, Ed448=16).
- All other commands and flags verified correct: `drill -D/-T/-S`, `delv +vtrace`, `dig +trace +dnssec`, DNSKEY flag values (256=ZSK, 257=KSK), and the RRSIG field ordering.
