# Validation Summary: How to Configure MX Records for IPv6 Mail Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS (MX records, AAAA records, A records)
- IPv6 / IPv4 dual-stack
- SMTP (port 25)
- Postfix (`inet_protocols`)
- BIND-style zone file syntax
- `dig` (DNS lookup utility)
- `nc` / netcat (IPv6 connectivity test)
- `swaks` (Swiss Army Knife for SMTP)
- `ss` (socket statistics)
- MX Toolbox API

## Sources Consulted
- [RFC 5321 — Simple Mail Transfer Protocol](https://datatracker.ietf.org/doc/html/rfc5321) — confirms MX RDATA must be a domain name and lower preference values are tried first
- [RFC 1035 — Domain Names Implementation and Specification](https://datatracker.ietf.org/doc/html/rfc1035) — MX RR format
- [RFC 3596 — DNS Extensions to Support IP Version 6](https://datatracker.ietf.org/doc/html/rfc3596) — AAAA record type definition
- [RFC 3849 — IPv6 Address Prefix Reserved for Documentation](https://datatracker.ietf.org/doc/html/rfc3849) — `2001:db8::/32` is the documentation prefix used in the post
- [RFC 5737 — IPv4 Address Blocks Reserved for Documentation](https://datatracker.ietf.org/doc/html/rfc5737) — `203.0.113.0/24` (TEST-NET-3) used in the post
- [Postfix IPv6 Support](https://www.postfix.org/IPV6_README.html) — confirms `inet_protocols = all` is valid for dual-stack
- swaks man page — confirms `[IPv6]:port` bracket notation for `--server`
- netcat (OpenBSD `nc`) man page — confirms `-6` (IPv6 only), `-v` (verbose), `-w` (timeout) flags
- [MxToolbox API documentation](https://knowledgebase.mxtoolbox.com/home/about-api) — unauthenticated lookups for `example.com` are permitted as a test endpoint

## Issues Found
No technical issues found. Verified items:
- MX records correctly point to hostnames (not IP addresses), matching RFC 5321 §5.1.
- AAAA record syntax is correct (RFC 3596).
- Lower MX preference number = higher priority — correct per RFC 5321.
- Zone file format (`name TTL class type rdata`) is syntactically valid.
- `dig MX example.com +short` output format is `<priority> <hostname>.`, so `awk '{print $2}'` correctly extracts the hostname.
- The "WRONG" example correctly shows that putting an IPv6 literal in MX RDATA is invalid.
- IPv6 documentation prefix `2001:db8::/32` and IPv4 TEST-NET-3 `203.0.113.0/24` are appropriate for examples.
- swaks IPv6 bracket syntax `[2001:db8::10]:25` is correct.
- `nc -6 -v -w 5 host 25` flags are valid.
- `inet_protocols = all` is a valid Postfix setting.
- The MX Toolbox curl example targets `example.com`, which is the one domain the API allows unauthenticated.

## Review Notes
- The MX Toolbox API endpoint requires an API key for any domain other than `example.com`. Since the post uses `example.com`, the example will function as shown, but readers adapting the snippet to a real domain will need to add an `Authorization` header with their API key.
- The swaks command uses `--from test@otherdomain.com`; in real-world testing the sender domain should be one whose MX/SPF won't trigger rejection, but this is a tutorial-level concern, not a technical error.
- Postfix `inet_protocols` changes require a full `postfix stop && postfix start` (not just `reload`) to take effect — worth knowing for readers, but the post correctly mentions only the parameter, not the apply procedure.
- `ss -tlnp` requires root/CAP_NET_ADMIN to display the process column; without privileges it still works but the `-p` info is hidden. Not an error.
