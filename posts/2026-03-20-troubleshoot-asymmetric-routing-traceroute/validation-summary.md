# Validation Summary: How to Troubleshoot Asymmetric Routing with Traceroute

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Traceroute and tracepath
- Asymmetric IPv4 routing
- ICMP Time Exceeded and TTL-based path discovery
- mtr
- Linux iproute2 policy routing
- Netfilter conntrack, stateful firewalls, and NAT

## Sources Consulted
- Linux traceroute(8) manual page: https://www.man7.org/linux/man-pages/man8/traceroute.8.html
- iputils tracepath(8) manual page: https://manpages.debian.org/unstable/iputils-tracepath/tracepath.8.en.html
- mtr upstream repository and documentation: https://github.com/traviscross/mtr
- Ubuntu mtr(8) manual page: https://manpages.ubuntu.com/manpages/jammy/man8/mtr.8.html
- Linux ip-rule(8) manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Linux ip-route(8) manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Netfilter conntrack-tools conntrack(8) manual page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- RFC 792, Internet Control Message Protocol: https://datatracker.ietf.org/doc/html/rfc792
- RFC 1812, Requirements for IP Version 4 Routers: https://datatracker.ietf.org/doc/rfc1812/
- Local command/man-page checks for tracepath, mtr, ip-route, and ip-rule.

## Issues Found
- The introduction said asymmetric routing causes connection problems. Changed this to "can cause" because asymmetric paths are common and often benign unless stateful devices or NAT are in the path.
- The tracepath `asymm` explanation treated the value as proof of asymmetric routing. Updated it to describe `asymm` as an estimated return-hop count and a hint, matching the tracepath manual's reliability caveat.
- The reverse traceroute comparison claimed different hops definitively prove asymmetry. Changed this to "likely" asymmetry for the tested probe type, since traceroute paths can vary by protocol, port, and load-balancing behavior.
- The missing-hop traceroute example incorrectly said `* * *` at an intermediate hop indicates asymmetric return-path behavior. Rewrote it to explain that the router may not have sent ICMP Time Exceeded, or the reply may have been filtered, rate-limited, or lost.
- The TCP firewall example referred to `RST/ACK` returning after a SYN. Changed this to `SYN/ACK or later packets`, which matches normal TCP connection establishment and still covers later asymmetric-flow failures.
- The conntrack note said a matching connection should show `ESTABLISHED` without context. Clarified that active completed TCP sessions should show `ESTABLISHED`, while `SYN_SENT` without establishment suggests reply traffic is not being tracked.
- The mtr section said `mtr -b` shows bidirectional latency hints. Corrected this because `-b`/`--show-ips` displays hostnames and numeric IPs; it does not reveal the reverse path.
- The mtr jitter explanation overstated intermediate-hop jitter as an asymmetry signal. Updated it to distinguish end-to-end loss/jitter from intermediate-only ICMP rate limiting or deprioritization.
- The closing sentence called policy routing the primary fix. Changed it to say routing-metric changes and policy routing are common fixes in controlled environments.

## Review Notes
The `traceroute` and `conntrack` binaries were not installed in the local environment, so those commands were verified against their manual pages rather than local `--help` output. The examples are valid as diagnostic patterns, but production fixes should use routing rules, priorities, and persistent network configuration appropriate to the specific distribution and affected traffic flow.
