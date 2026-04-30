# Validation Summary: How to Understand Happy Eyeballs Algorithm (RFC 8305)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 and IPv4 dual-stack client networking
- Happy Eyeballs v2 (RFC 8305)
- Destination address selection (RFC 6724)
- DNS A and AAAA lookups
- curl and libcurl
- Node.js `net` and `http`
- Python `asyncio`
- Go `net`
- `strace` and `tcpdump`

## Sources Consulted
- RFC 8305: https://datatracker.ietf.org/doc/rfc8305/
- RFC 6724: https://www.rfc-editor.org/rfc/rfc6724
- curl man page: https://curl.se/docs/manpage.html
- libcurl `CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS`: https://curl.se/libcurl/c/CURLOPT_HAPPY_EYEBALLS_TIMEOUT_MS.html
- Node.js `net` documentation: https://nodejs.org/api/net.html
- Node.js `http` documentation: https://nodejs.org/api/http.html
- Python `asyncio` event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- Python `asyncio` streams documentation: https://docs.python.org/3/library/asyncio-stream.html
- Go `net` package documentation: https://pkg.go.dev/net

## Issues Found
- The post described Happy Eyeballs as fully simultaneous connection racing. RFC 8305 uses asynchronous DNS handling plus staggered connection attempts with a delay between attempts, so I corrected the introduction, problem statement, diagram wording, and summary.
- The Resolution Delay explanation was reversed. RFC 8305 says the client waits briefly for AAAA after an A response arrives first, not the other way around, so I fixed that parameter description.
- The address sorting section was misleading. RFC 8305 first applies RFC 6724 destination address selection and then interleaves address families using First Address Family Count, so I replaced the inaccurate scope-based list with the RFC-defined behavior.
- The `curl -w "@curl-timing.txt"` example depended on an external file that was not included in the post. I replaced it with a standalone `--write-out` format string and added curl's IPv6-build caveat.
- The Node.js section incorrectly said Happy Eyeballs lived in the DNS module and that `family: 0` enabled it for `http.Agent`. Current Node.js documents automatic family selection in the `net` module via `socket.connect()` options such as `autoSelectFamily`, so I rewrote the example to match the official API.
- The Python section incorrectly attributed support to the `socket` module and described the behavior as simultaneous. The official `asyncio` APIs expose Happy Eyeballs through `happy_eyeballs_delay`, so I corrected the text/comments and added `await writer.wait_closed()`.
- The `strace` command was invalid because `getaddrinfo` is not a syscall accepted by `strace -e trace=...`. I changed it to trace the relevant `socket` and `connect` syscalls.

## Review Notes
- Node.js documents `autoSelectFamily` as loosely implementing section 5 of RFC 8305 rather than a complete RFC 8305 implementation.
- Go's `net` package documentation refers to RFC 6555 Fast Fallback / Happy Eyeballs rather than RFC 8305 specifically.
- The revised Node.js, Python, curl, and `strace` examples were smoke-tested locally on 2026-04-30.
- The `tcpdump -i eth0` example remains environment-specific because interface names vary by system, but it is technically valid on systems that use `eth0`.
