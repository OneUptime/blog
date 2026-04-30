# Validation Summary: How to Understand the Performance Impact of IPv4 Fragmentation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- IP fragmentation and reassembly
- Linux networking
- iproute2 (`ip`, `tc`, `nstat`)
- `ping`
- `iperf3`
- Python

## Sources Consulted
- RFC 791: Internet Protocol — https://www.rfc-editor.org/rfc/rfc791.html
- RFC 4293: Management Information Base for the Internet Protocol (IP) — https://www.rfc-editor.org/rfc/rfc4293
- Linux `ip(7)` — https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `udp(7)` — https://man7.org/linux/man-pages/man7/udp.7.html
- Linux `ping(8)` — https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `ip-link(8)` — https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `tc-netem(8)` — https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Linux IP sysctl documentation — https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- iperf3 invocation documentation — https://software.es.net/iperf/invoking.html
- iperf3 source and release notes — https://github.com/esnet/iperf/blob/master/src/iperf_client_api.c and https://github.com/esnet/iperf/blob/master/RELNOTES.md

## Issues Found
- The post used `tc qdisc add ... netem mtu 1400`, but `tc-netem(8)` has no `mtu` option. I replaced it with `ip link set dev eth0 mtu 1400` and restored the original MTU after the test.
- The "without fragmentation" `iperf3 -l 1400` example was incorrect for IPv4 UDP on a 1400-byte MTU, because a 1400-byte UDP payload becomes a 1428-byte IP packet. I corrected it to `-l 1372`.
- The fragment-loss calculator did not account for the UDP header or the IPv4 rule that non-final fragments use 8-byte payload alignment. I updated the code and adjusted the sample payload sizes.
- The `IpReasmReqds` and `IpReasmFails` comments were too narrow. I changed them to match RFC 4293, which defines them as fragments requiring reassembly and reassembly failures for any reason.
- Several explanatory statements were too absolute or imprecise, including the unsourced `20-40%` throughput claim, the use of "exponentially", the simplified "N times the failure chance" wording, and the claim that any `IpReasmFails` value specifically means lost fragments. I qualified or softened those statements to keep them technically accurate.
- The `ping` example relied on privileged flood mode and implicit PMTU behavior. I added a privilege note and made the fragmentation behavior explicit with `-M want`.

## Review Notes
- The post is specifically about IPv4. The `path MTU minus 28 bytes` guidance is correct for UDP over IPv4 without IP options.
- Linux UDP performs PMTU discovery by default, and current iperf3 defaults are designed to avoid fragmentation unless the user explicitly requests a larger UDP send size with `-l`.
