# Validation Summary: How to Test IPv4 Connectivity with ping and traceroute on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking diagnostics
- IPv4
- ICMP Echo with `ping`
- `traceroute`
- `tracepath`
- `mtr`

## Sources Consulted
- Local `ping(8)` man page and `ping -h` output from iputils 20240117
- iputils upstream `ping` documentation: https://github.com/iputils/iputils/blob/master/doc/ping.xml
- Local `tracepath(8)` man page and `tracepath -h` output from iputils 20240117
- iputils upstream `tracepath` documentation: https://github.com/iputils/iputils/blob/master/doc/tracepath.xml
- Linux `traceroute(8)` manual page: https://www.man7.org/linux/man-pages/man8/traceroute.8.html
- Local `mtr(8)` man page and `mtr --help` output
- mtr upstream man page: https://github.com/traviscross/mtr/blob/master/man/mtr.8.in
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792

## Issues Found
- The intro said `ping` tests end-to-end reachability generally. Changed it to ICMP end-to-end reachability because successful or failed ICMP Echo does not fully prove application-level connectivity.
- The intro said `traceroute` maps each hop. Changed this to responding hops because routers can filter, rate-limit, or ignore traceroute probes.
- The first `ping` comment said 4 requests were sent by default while also noting Linux sends continuously. Reworded it to clarify that `-c 4` sends four requests and Linux sends continuously without `-c`.
- The `mdev` explanation called it mean deviation/jitter. Updated it to RTT variability/population standard deviation, matching the iputils documentation.
- The flood ping comment said it tests bandwidth. Reworded it to stress-testing packet handling and loss because `ping -f` is not a reliable bandwidth test.
- The `* * *` traceroute explanation attributed missing replies only to ICMP filtering. Broadened it to timeout, filtering, rate limiting, or loss.
- The `apt install mtr-tiny` comment did not specify distribution family. Updated it to Debian/Ubuntu.
- The conclusion implied a failed ping means connectivity breaks at a hop. Reworded it to narrowing down where probes stop receiving replies.

## Review Notes
- The commands and options shown are valid for common Linux implementations: iputils `ping`/`tracepath`, Linux `traceroute`, and `mtr`.
- `traceroute` was not installed in the local environment, so its flags were verified against the Linux `traceroute(8)` manual page rather than local `--help`.
