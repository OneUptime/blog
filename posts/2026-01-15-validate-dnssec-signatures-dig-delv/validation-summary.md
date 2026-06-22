# Validation Summary: How to Validate DNSSEC Signatures with dig and delv

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- DNSSEC
- DNS
- BIND `dig`
- BIND `delv`
- BIND `dnssec-dsfromkey`
- Linux and macOS command-line tooling

## Sources Consulted
- BIND 9 manual pages for `dig`, `delv`, and `dnssec-dsfromkey`: https://bind9.readthedocs.io/en/stable/manpages.html
- ISC Knowledgebase, "dig and delv": https://kb.isc.org/docs/aa-01152
- RFC 4033, DNS Security Introduction and Requirements: https://www.rfc-editor.org/rfc/rfc4033
- RFC 4034, Resource Records for the DNS Security Extensions: https://datatracker.ietf.org/doc/html/rfc4034
- IANA DNS Security Algorithm Numbers registry: https://www.iana.org/assignments/dns-sec-alg-numbers
- Local BIND utilities help output from `dig -h`, `delv -h`, and installed version checks.

## Issues Found
- The post used `delv -v example.com` as a verbose-output example. In BIND `delv`, `-v` prints version information and exits. Changed it to `delv +vtrace example.com`, which traces the validation process.
- The post used `delv +cd example.com` to disable DNSSEC validation. Current `delv` uses `-i` for insecure mode/disabling internal validation; `+cd` is not a valid `delv` option in the checked local version. Changed the command to `delv -i example.com`.
- The post used `delv +rrsig example.com` to show signatures. Current `delv` uses `+dnssec` / `+nodnssec` to control RRSIG display. Changed the command to `delv +dnssec example.com`.
- The algorithm table described RSA/SHA-256 as merely acceptable and RSA/SHA-512 as acceptable for use. The current IANA DNSSEC algorithm registry recommends RSA/SHA-256, while RSA/SHA-512 is recommended for validation but not recommended for new signing. Updated those recommendations.

## Review Notes
- The remaining `dig` and `delv` examples are syntactically valid for BIND-family tooling, but live output can vary by resolver, local DNSSEC validation support, cache state, and current DNS records.
- `delv +dnssec` displays DNSSEC records; unlike `dig +dnssec`, it does not control whether DNSSEC data is requested or whether validation occurs.
