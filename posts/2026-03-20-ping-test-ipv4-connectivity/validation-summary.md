# Validation Summary: How to Use Ping to Test IPv4 Connectivity

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `ping` (`iputils-ping`)
- ICMP Echo Request / Echo Reply
- IPv4 connectivity testing
- Linux networking diagnostics
- Bash

## Sources Consulted
- Linux `ping(8)` manual page (iputils): https://man7.org/linux/man-pages/man8/ping.8.html
- RFC 792, Internet Control Message Protocol: https://datatracker.ietf.org/doc/html/rfc792
- FreeBSD `ping(8)` manual page (for BSD option differences): https://man.freebsd.org/cgi/man.cgi?query=ping&sektion=8
- Linux `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Local CLI help and command output: `ping -h`, `ping -c 2 127.0.0.1`, `ip -help`, `ip -s link show lo`

## Issues Found
- The hostname examples used `ping google.com` even though the post is specifically about IPv4 connectivity. On Linux, `ping` can use IPv6 unless `-4` is specified, so I changed the hostname examples to `ping -4 google.com`.
- The sample output in "Reading Ping Output" used BSD/macOS-style formatting (`PING ...: 56 data bytes`) even though the post is tagged for Linux. I updated it to Linux `iputils` output format.
- The TTL explanation implied hop count can be inferred with `128-ttl` or `64-ttl`. That is not generally reliable unless the sender's initial TTL is known, so I corrected the explanation.
- The MTU example used only `-s 1400`, which changes payload size but does not prevent fragmentation by itself. I changed it to `ping -M do -s 1400 -c 4 ...` so the example matches MTU testing on Linux.
- The interval example said `-i 0.1` needs root and used `sudo`. On Linux `ping`, only intervals below 2 ms require elevated privileges, so I removed `sudo` and corrected the note.
- The conclusion said large packet sizes test MTU. I updated that sentence to reflect that PMTU-related options must be used with larger packets for meaningful MTU testing.

## Review Notes
- `ping -R` is valid for IPv4 record-route testing, but many hosts and gateways ignore or drop the RECORD_ROUTE option, so results are often limited in real networks.
- Successful `ping` responses confirm ICMP reachability, but some hosts and firewalls intentionally block Echo Requests, so a failed `ping` does not always prove the destination is otherwise unreachable.
