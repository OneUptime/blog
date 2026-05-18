# Validation Summary: How to Test Network Connectivity with ping, traceroute, and mtr on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ping (iputils)
- traceroute
- tracepath
- mtr (Matt's Traceroute)
- ICMP / UDP / TCP probing
- Ubuntu networking utilities

## Sources Consulted
- `man mtr` (mtr 0.95 on Ubuntu) — confirmed flag semantics, especially `-I NAME` (interface) vs `-u` (UDP) vs `-T` (TCP), and that ICMP ECHO is the default packet mode.
- `man ping` (iputils) — verified `-c`, `-s`, `-i`, `-t`, `-f`, `-I`, `-q`, `-a`, `-4`, `-6` options and their behavior (e.g. `-t ttl` sets IP TTL; `-f` requires root only for zero interval; `-I` accepts interface name).
- iputils ping documentation: https://manpages.ubuntu.com/manpages/jammy/en/man8/ping.8.html
- mtr documentation: https://manpages.ubuntu.com/manpages/jammy/en/man8/mtr.8.html
- traceroute(8) reference: https://manpages.ubuntu.com/manpages/jammy/en/man8/traceroute.8.html — verified `-T -p`, `-I`, `-m`, `-n`, `-w` (default 5s), `-i device`, `traceroute6` / `-6` flags.
- tracepath(8): https://manpages.ubuntu.com/manpages/jammy/en/man8/tracepath.8.html — confirmed non-root usage and MTU discovery behavior.
- RFC 792 (ICMP) — confirmed Echo Request/Reply and Time Exceeded semantics described in the traceroute section.

## Issues Found
1. **Incorrect mtr `-I` flag described as "ICMP mode"** — The post claimed `mtr -I google.com` enabled "ICMP mode instead of UDP". This is wrong on two counts:
   - In current mtr, `-I NAME` is `--interface NAME` (selects a network interface), not an ICMP toggle. Running `mtr -I google.com` would try to use "google.com" as the interface name and fail.
   - mtr's default packet mode is already ICMP ECHO; UDP must be requested with `-u`, and TCP with `-T`. So there is no "ICMP mode" flag to enable in the first place.
   
   **Fix applied:** Replaced the misleading example with `mtr -u google.com` documented as "UDP mode instead of the default ICMP", which is the accurate counterpart to the existing TCP example above it.

## Review Notes
- The remaining `ping` and `traceroute` flag descriptions are accurate against current iputils and traceroute man pages, including `-i eth0` (interface, traceroute) vs `-I` (ICMP, traceroute) — note the case-sensitive flag inversion between `traceroute` and `mtr`, which the post handles correctly after the fix.
- `ping -f` is described as requiring root. Strictly, non-root users can use `-f` but with rate limits; only root can use it with zero interval. The post's simplified phrasing is acceptable for a how-to.
- The mtr output column ordering shown (Loss%, Snt, Last, Avg, Best, Wrst, StDev) matches mtr 0.95+ report output.
- Example IPs (142.250.80.46 for google.com, 8.8.8.8) are realistic and valid.
- ping default packet size annotation `56(84) bytes` is correct: 56 bytes ICMP payload + 8-byte ICMP header + 20-byte IPv4 header = 84 total.
- The diagnostic workflow (local → gateway → external IP → hostname → trace) is the standard recommended approach.
