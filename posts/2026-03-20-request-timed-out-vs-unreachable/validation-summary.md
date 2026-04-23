# Validation Summary: How to Troubleshoot 'Request Timed Out' vs 'Destination Unreachable'

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP
- IPv4 networking
- `ping`
- `traceroute`
- `iproute2`
- `netcat`
- Windows `ping`

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `traceroute(8)` manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Microsoft Learn, `ping` command: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Local CLI help output for `ping`, `ip route`, and `nc` in the review environment

## Issues Found
- The comparison table was fenced as `yaml`, but the contents were plain text rather than valid YAML. I changed the fence to `text` so the snippet is technically accurate.
- The post implied that `"Destination Host Unreachable"` always comes from network infrastructure. RFC 792 allows ICMP destination-unreachable messages to be composed by a gateway or host, so I corrected the wording to say the error can come from your host or a router.
- The original troubleshooting path used `traceroute` to identify which router was sending the unreachable error. That was too strong: the ping output already identifies the ICMP sender, while `traceroute` uses different probes and does not reliably prove the same device is the failing hop. I changed that example to `ip route get` and clarified the interpretation.
- The sample fix `ip route add 10.50.0.0/24 via 192.168.1.1` was misleading in context because `192.168.1.1` was also the device shown returning the unreachable error. I replaced it with an example that explicitly represents switching to a different gateway.
- The Linux ping examples used bare `ping` but showed a deterministic four-packet summary. I changed them to `ping -c 4` so the commands match the documented output.
- Several traceroute conclusions were too absolute. Standard Linux `traceroute` uses UDP probes by default and normally gets an ICMP port-unreachable from the destination as the final response, so "traceroute reaches the target" does not mean "ICMP is blocked" in general. I rewrote those lines to distinguish traceroute probe responses from ICMP Echo behavior.
- The post used `tcptraceroute` even though current `traceroute(8)` documents built-in TCP mode with `-T -p <port>`. I replaced the example with `traceroute -T -p 80` to use the current traceroute syntax already discussed elsewhere in the post.
- The asymmetric-routing section treated a successful reverse ping as proof that "your return path to you is broken," which was backwards. I corrected the explanation, added `ip route get <your-ip>` to inspect the reply path, and narrowed the sample return route to a source subnet instead of the overly broad `10.0.0.0/8`.

## Review Notes
- The post is now technically sound after the fixes above.
- The examples are Linux-oriented for `ping`, `traceroute`, `ip route`, and `nc`; the Windows reference is limited to the `"Request timed out"` message and matches current Microsoft documentation.
- `traceroute` may not be installed by default on every Linux distribution, but the command syntax used in the post is valid per the current manual.
- MTU black-hole symptoms are usually easiest to reproduce with larger packets and PMTU-related testing rather than default small ping payloads.
