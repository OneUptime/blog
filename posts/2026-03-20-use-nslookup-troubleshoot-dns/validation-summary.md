# Validation Summary: How to Use nslookup to Troubleshoot DNS Issues

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nslookup (BIND 9 utility)
- DNS (record types: A, AAAA, MX, NS, TXT, SOA, ANY, PTR)
- dig (comparison tool)
- Linux, macOS, Windows command-line usage
- Public DNS resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1)

## Sources Consulted
- BIND 9 nslookup man page (local: `man nslookup`) — confirms synopsis `nslookup [-option] [name | -] [server]`, interactive commands, and options (`type=`, `querytype=`, `timeout=`, `retry=`, `debug`, `d2`)
- RFC 1035 (Domain Names - Implementation and Specification) — record type semantics (A, NS, MX, SOA, TXT, PTR)
- RFC 3596 — AAAA record for IPv6
- RFC 8020 / NXDOMAIN semantics — "domain does not exist" response code
- Microsoft Learn documentation for Windows `nslookup` command — confirms `-timeout`, `-retry`, `-debug` flags on Windows
- dig man page (ISC BIND) — confirms `+short`, `-f`, `+trace`, `+dnssec` flags referenced in comparison section

## Issues Found
No technical issues found.

Verified specifically:
- `nslookup domain server` syntax is correct (second positional argument = name server).
- `-type=MX|NS|TXT|AAAA|SOA|ANY` are all valid `querytype` values.
- Reverse lookup by IP (`nslookup 93.184.216.34`) uses default PTR handling when given an IP address — correct.
- Interactive mode commands `server`, `set type=`, `set debug`, `exit` are all documented in the BIND man page.
- Windows-only-style flags `-timeout=5`, `-retry=3`, `-debug` are valid on both Linux and Windows nslookup (not Windows-exclusive, but valid as shown).
- "Non-authoritative answer" explanation (answer came from cache / recursive resolver, not directly from the authoritative server) is accurate.
- `NXDOMAIN = domain does not exist` is the correct RCODE 3 meaning.
- The `grep "nameserver" | awk '{print $NF}'` pattern matches nslookup Linux output format for `-type=NS` queries (lines like `example.com    nameserver = a.iana-servers.net.`).
- example.com IP (93.184.216.34) was the long-standing IANA example address (note: example.com IPs can change over time, but this is used purely as an illustrative value).
- dig comparison points (TTL display, `+short`, `+trace`, `+dnssec`, `-f batch_file`) are accurate.

## Review Notes
- Minor typo in tags: "Window" should be "Windows". This is a metadata/spelling issue rather than a technical error, so per guidance ("Only fix technical errors") it was left unchanged.
- `nslookup -type=ANY` still works syntactically, but many authoritative servers now return minimal/HINFO responses to ANY queries per RFC 8482. Not incorrect to document, but worth noting that results may be sparse in practice.
- nslookup has been soft-deprecated in favor of `dig`/`host` by ISC in documentation, but it continues to ship with BIND 9 and remains the default DNS tool on Windows. The post correctly positions it as "simple / cross-platform" rather than "preferred".
- The troubleshooting snippet that extracts the authoritative NS via `grep "nameserver" | awk '{print $NF}'` relies on output formatting that is stable on Linux/macOS nslookup but may differ on Windows; the surrounding bash script context makes this acceptable.
