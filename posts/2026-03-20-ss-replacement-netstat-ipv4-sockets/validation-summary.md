# Validation Summary: How to Use ss as a Replacement for netstat to View IPv4 Sockets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux
- iproute2 `ss`
- net-tools `netstat`
- IPv4 sockets
- TCP, UDP, and raw sockets
- Shell command-line diagnostics

## Sources Consulted
- Linux `ss(8)` manual page from man7.org: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `netstat(8)` manual page from man7.org: https://man7.org/linux/man-pages/man8/netstat.8.html
- Debian unstable `iproute2` `ss(8)` manual page: https://manpages.debian.org/unstable/iproute2/ss.8.en.html
- Local `ss --help` and command checks using `ss` from `iproute2-6.1.0`

## Issues Found
- The post said `ss -4` showed all IPv4 TCP, UDP, and raw sockets. `ss` omits listening sockets by default, so this was changed to `ss -4tuwa`, with `ss -4tuwna` as the numeric-address version.
- The TCP section described `ss -4tn` as showing more detail. The `-n` option controls numeric output, so the comment now says it shows numeric addresses and ports.
- The TCP section did not explain that `ss -4tna` includes listening sockets because of `-a`. The comment now says it shows all TCP sockets, including listening sockets.
- The listening-sockets section used `ss -4ln` for TCP and UDP. This was changed to `ss -4tuln` to explicitly match the TCP + UDP description.
- The process-information section used a TCP-only command while describing each socket. This was changed to `ss -4tulnp` and the wording now notes that process information is shown where permitted.
- The established-connections section piped `ss -4tn state established` to `grep ESTAB`, but the filtered output may not include an `ESTAB` state token. The command now uses `ss -4tn state established` directly to show numeric endpoints.
- The conclusion said `ss -4tlnp` showed all IPv4 listening ports with process information. This was corrected to `ss -4tulnp` and scoped to listening TCP and UDP sockets where permitted.

## Review Notes
`ss -s` is technically valid, but it reports a general socket summary rather than an IPv4-only summary. Typical output includes separate IP and IPv6 columns.
