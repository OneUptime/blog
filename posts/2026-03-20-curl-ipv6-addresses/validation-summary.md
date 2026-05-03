# Validation Summary: How to Use curl with IPv6 Addresses

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- curl (HTTP client CLI)
- IPv6 addressing
- IPv6 link-local addresses with scope IDs
- HTTP/HTTPS
- Happy Eyeballs (dual-stack connection algorithm)
- Bash scripting

## Sources Consulted
- curl manual page (`curl --manual`) and `curl --help all` output (verified against curl 8.5.0)
- curl official docs: https://curl.se/docs/manpage.html
- curl `--resolve` documentation: https://everything.curl.dev/usingcurl/connections/name.html
- curl `--write-out` variables: https://everything.curl.dev/usingcurl/verbose/writeout.html
- RFC 2732 — Format for Literal IPv6 Addresses in URL's
- RFC 3986 — URI Generic Syntax (obsoletes/incorporates RFC 2732)
- RFC 6874 — Representing IPv6 Zone Identifiers in URIs (scope ID `%25` URL-encoding)
- RFC 8305 — Happy Eyeballs Version 2

## Issues Found
No technical issues found.

All commands, flags, and write-out format variables (`%{remote_ip}`, `%{http_code}`, `%{time_namelookup}`, `%{time_connect}`, `%{time_appconnect}`, `%{time_total}`) were verified against curl 8.5.0 and the official curl documentation. The `-6`/`-4` flags, `--resolve HOST:PORT:ADDR` syntax, `--interface`, and link-local scope ID URL-encoding (`%25`) are all correctly described.

## Review Notes
- RFC 2732 is technically obsoleted by RFC 3986, which incorporates the IPv6 bracket-in-URL syntax. RFC 2732 is still a valid historical reference for the bracket-syntax origin and is widely cited.
- `-X POST` together with `-d` is redundant (curl implies POST when `-d` is used) but is a common idiom and not incorrect.
- For link-local IPv6 addresses, `--interface eth0` alone (without a scope ID in the URL) may not always succeed because the kernel needs the scope to route. The post correctly presents the `%25eth0` scope-ID-in-URL approach as the primary method and offers `--interface` as an alternative — this matches typical curl usage. No change needed.
- `-6` combined with a literal IPv6 URL (e.g. `https://[2001:db8::1]/`) is redundant since the URL already forces IPv6, but is harmless.
- The post correctly notes that IPv6 addresses in `--resolve` do not require brackets (curl parses up to the second colon as host:port). Bracketed form was added in curl 7.57.0; both forms work.
