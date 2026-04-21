# Validation Summary: How to Use Traceroute to Map the Network Path

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Traceroute
- ICMP Time Exceeded
- IPv4 TTL
- UDP, ICMP, and TCP traceroute probes
- Paris traceroute
- Dublin Traceroute
- Bash automation

## Sources Consulted
- Linux traceroute manual page: https://linuxman7.org/linux/man-pages/man8/traceroute.8.html
- RFC 1812, Requirements for IP Version 4 Routers: https://www.ietf.org/rfc/rfc1812
- RFC 5388, Information Model and XML Data Model for Traceroute Measurements: https://www.rfc-editor.org/rfc/rfc5388
- Paris Traceroute project documentation: https://paris-traceroute.net/about/
- libparistraceroute installation documentation: https://github.com/libparistraceroute/libparistraceroute/wiki/Installation
- Debian package tracker for paris-traceroute: https://tracker.debian.org/pkg/paris-traceroute
- Dublin Traceroute documentation: https://dublin-traceroute.net/
- Ubuntu apt package metadata for traceroute 2.1.5 and dublin-traceroute 0.4.2 from the local package cache

## Issues Found
- The sequence diagram only listed ICMP Echo Reply and Port Unreachable as destination-reached responses. Updated it to also mention TCP responses, since the post includes TCP traceroute.
- The ICMP traceroute command said ICMP is less likely to be filtered. The Linux traceroute manual describes TCP traceroute as the firewall-bypass method and notes ICMP can also be filtered, so the comment was changed to describe the probe type instead.
- The post used `apt install paris-traceroute`, but the Debian tracker marks the package as removed from current Debian distributions and the project documentation recommends source installation or distribution-specific packages where available. Replaced the apt command with a package-availability/source-install note.
- The conclusion said traceroute shows the physical and logical path of traffic. Traceroute reports the logical hop-by-hop forwarding path and RTTs, not the physical path, so the wording was narrowed to "logical forwarding path."

## Review Notes
- The local environment did not have `traceroute`, `paris-traceroute`, or `dublin-traceroute` installed, so CLI validation was performed against manual pages, project documentation, RFCs, and local apt package metadata rather than executing the commands.
- The Bash automation snippet is syntactically valid for extracting the last displayed hop count, but a production check should also confirm the destination was actually reached.
