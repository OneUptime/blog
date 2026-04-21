# Validation Summary: How to Use Traceroute to Map Network Paths on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traceroute
- IPv4 TTL behavior
- ICMP Time Exceeded, Destination Unreachable, and Echo Reply messages
- UDP, ICMP, and TCP traceroute probe methods
- MPLS ICMP extensions
- Bash scripting

## Sources Consulted
- Linux traceroute manual page from the traceroute project, covering TTL probing, default UDP probes, `-n`, `-m`, `-I`, `-T`, `-p`, `-i`, `-s`, `-w`, and `-e` options (https://man7.org/linux/man-pages/man8/traceroute.8.html)
- RFC 791, Internet Protocol, for IPv4 Time To Live behavior (https://www.rfc-editor.org/rfc/rfc791)
- RFC 792, Internet Control Message Protocol, for ICMP Destination Unreachable, Time Exceeded, and Echo Reply semantics (https://www.rfc-editor.org/rfc/rfc792)
- RFC 4950, ICMP Extensions for Multiprotocol Label Switching, for MPLS label information in ICMP messages used by enhanced traceroute output (https://datatracker.ietf.org/doc/html/rfc4950)
- Microsoft Learn tracert documentation, for Windows `tracert` ICMP Echo Request behavior and default max-hop behavior (https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert)
- Cisco documentation on traceroute behavior across operating systems, ICMP unreachable responses, UDP probe ports, and Windows ICMP-based `tracert` behavior (https://www.cisco.com/c/en/us/support/docs/ip/ip-routed-protocols/22826-traceroute.html)

## Issues Found
1. **Traceroute path certainty was overstated.** The post said traceroute reveals the exact path and every router. Traceroute only shows responding routers/interfaces for the probes sent, and routers can be hidden by filtering, rate limiting, MPLS behavior, or load balancing. Changed the introduction to describe the path as what packets appear to take and what responding routers show.
2. **Final response types were incomplete.** The post said tracing continues until ICMP Destination Unreachable or ICMP Echo Reply. Linux UDP traceroute normally expects ICMP port unreachable, ICMP mode expects Echo Reply, and TCP mode can end with a TCP reset or SYN/ACK handling. Updated the explanation to distinguish UDP, ICMP, and TCP probes.
3. **TCP traceroute firewall wording was too absolute.** The post called TCP SYN probes the best at bypassing firewalls. TCP probes are useful when UDP or ICMP are filtered, but they only help when the selected protocol and port are allowed. Reworded the comment accordingly.
4. **Stopped traceroute interpretation was too specific.** The post said if traceroute stops at hop 3, the router at hop 3 has no route forward. A stopped trace can also mean later devices, firewalls, return paths, or ICMP responses are filtered or rate limited. Updated the note to say traffic or traceroute replies are blocked beyond that point.
5. **Latency jump interpretation was inaccurate.** The post said a hop 5 jump from 10 ms to 150 ms means the link between hop 5 and 6 is slow. Traceroute RTT is round-trip time to the responding hop, and intermediate hops can deprioritize diagnostic responses. Updated the note to focus on latency that jumps at a hop and remains high afterward.
6. **MPLS option was wrong for Linux traceroute.** The post used `traceroute --mpls`, but the Linux traceroute manual documents `-e` / `--extensions` for showing ICMP extensions, including parsed MPLS labels when present. Changed the command to `traceroute -e 8.8.8.8`.

## Review Notes
- The installation commands and common traceroute flags (`-n`, `-m`, `-I`, `-T`, `-p`, `-i`, `-s`, and `-w`) are current and valid for the Linux traceroute implementation documented by the upstream manual page.
- `sudo` for ICMP and TCP traceroute is conservative. Some Linux systems allow unprivileged ICMP traceroute depending on kernel support and `ping_group_range`, but root privileges or capabilities are still commonly needed for raw-socket methods.
- The sample output is illustrative rather than guaranteed. Real traceroute output can vary because of DNS resolution, asymmetric routing, ECMP/load balancing, ICMP filtering, timeout settings, and router rate limiting.
