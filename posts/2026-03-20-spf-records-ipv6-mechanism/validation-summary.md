# Validation Summary: How to Configure SPF Records with IPv6 (ip6: Mechanism)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SPF
- IPv6
- DNS TXT records
- `dig`
- `pyspf`
- MxToolbox API
- Swaks
- Google Workspace SPF include records

## Sources Consulted
- RFC 7208: Sender Policy Framework (SPF), Version 1: https://datatracker.ietf.org/doc/html/rfc7208
- RFC 4291: IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849: IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Google Workspace Help, About SPF records: https://support.google.com/a/answer/10683907
- PySPF project documentation on PyPI: https://pypi.org/project/pyspf/
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.18.2/manpages.html
- Swaks manual page: https://manpages.debian.org/testing/swaks/swaks.1.en.html
- MxToolbox RESTful API Reference: https://mxtoolbox.com/api/api-reference

## Issues Found
- The `pyspf` example unpacked `spf.check2()` into three values (`result, code, explanation`), but the RFC 4408/7208-compliant `check2()` API returns two values: result and explanation. Updated the code example and output lines accordingly.
- The introduction said IPv6-enabled mail servers would fail SPF checks if `ip6:` was missing. This was too absolute because SPF evaluation depends on whether the sending connection is IPv6 and on the rest of the policy, such as `~all`, `-all`, or implicit neutral handling. Updated the sentence to describe the matching behavior accurately.
- The `~all` and `-all` comments implied receiver behavior was mandatory. RFC 7208 defines SPF results but does not require a specific receiver action for each result. Updated the comments to say `~all` is typically treated as suspicious and `-all` may be rejected by receivers.

## Review Notes
- The SPF `ip6:` syntax, CIDR prefix examples, DNS TXT usage, lookup-limit explanation, `dig` commands, MxToolbox example endpoint, and Swaks IPv6 server syntax were verified as technically valid.
- The example IPv6 addresses use `2001:db8::/32`, which is reserved for documentation and should be replaced with real sending addresses in production.
- MxToolbox documents unauthenticated access for its `example.com` test endpoint, while general API use requires an API key.
