# Validation Summary: How to Troubleshoot IPv6 Happy Eyeballs Issues

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- IPv6
- Happy Eyeballs / RFC 8305
- DNS (`dig`, A/AAAA lookups)
- `curl`
- Python `asyncio` / `socket`
- Go `net.Dialer`
- Node.js `node:net` / `dns.lookup`
- Linux networking tools (`ip`, `ping`, `sysctl`, `gai.conf`)

## Sources Consulted
- RFC 8305: Happy Eyeballs Version 2: Better Connectivity Using Concurrency — https://www.rfc-editor.org/rfc/rfc8305
- curl man page — https://curl.se/docs/manpage.html
- Python asyncio event loop documentation (`happy_eyeballs_delay`, `interleave`) — https://docs.python.org/3/library/asyncio-eventloop.html
- Python socket documentation (`setdefaulttimeout`) — https://docs.python.org/3/library/socket.html
- Go `net` package documentation (`Dialer.FallbackDelay`) — https://pkg.go.dev/net
- Node.js `net` documentation (`autoSelectFamily`, `autoSelectFamilyAttemptTimeout`) — https://nodejs.org/download/release/v22.17.0/docs/api/net.html
- Node.js `dns` documentation (`dns.lookup` ordering) — https://nodejs.org/download/release/v24.2.0/docs/api/dns.html
- BIND `dig` manual pages — https://bind9.readthedocs.io/en/v9.18.42/manpages.html
- Local `curl(1)`, `dig(1)`, `ping(8)`, and `gai.conf(5)` manual pages, plus the shipped `/etc/gai.conf` guidance

## Issues Found
- The Happy Eyeballs flow oversimplified RFC 8305 by skipping the DNS resolution delay and address-family interleaving. I updated the flow to reflect asynchronous AAAA/A lookups, the 50ms resolution delay, RFC 6724 sorting, and staggered connection attempts.
- The `curl` timing example used shell `time`, which measures the whole transfer rather than the connect path. I changed it to `curl -w` with `time_connect` and `time_appconnect` so the measurements match the troubleshooting goal.
- The `dig` exit-code note was incorrect. `dig` returns `9` for no reply from the server, not `1`; `1` is a usage error. I corrected the note.
- The Python Happy Eyeballs simulation could cancel the other family on first completion even if the first task failed, which does not model the intended fallback behavior. I rewrote it to continue until one connection succeeds or both fail, and switched it to documented `asyncio` APIs.
- The Python application guidance suggested `socket.setdefaulttimeout()`, which is a global default-socket timeout and not Happy Eyeballs-specific. I replaced it with `asyncio.open_connection(..., happy_eyeballs_delay=0.25, interleave=1)`.
- The Node.js guidance incorrectly described `dns.lookup()` as returning addresses in Happy Eyeballs order. I replaced it with `node:net` family autoselection, which is the documented Happy Eyeballs-related mechanism in current Node.js.
- The Linux troubleshooting section used `ping6`; I updated it to `ping -6`, which is the generic current form shown by the local `ping` help. I also corrected "problematic IPv6 addresses" to "problematic IPv6 routes" for the `ip -6 route del default` example.
- The conclusion was too absolute about causes and expected timings. I narrowed it to common causes and updated the measurement guidance to match the corrected `curl` example.

## Review Notes
- The `/etc/gai.conf` example is glibc/Linux-specific; other platforms may not use that mechanism.
- Node.js defaults around network family autoselection have changed across major versions, so the post now uses explicit `autoSelectFamily` and `autoSelectFamilyAttemptTimeout` values.
- The Go snippet was validated against official `net.Dialer` documentation, but the local environment did not have the Go toolchain installed to execute it.
