# Validation Summary: How to Understand UDP Protocol Basics and When to Use It

## Status
validated

## Post Type
Reference / Conceptual guide (with command examples)

## Technologies Covered
- UDP (User Datagram Protocol) — RFC 768
- TCP (for comparison) — RFC 9293
- netcat (`nc`) for UDP send/listen
- `ss` (iproute2) socket statistics
- `iperf3` for UDP throughput testing
- `dig` for DNS over UDP
- Common UDP-based application protocols: DNS, DHCP, NTP, SNMP, Syslog, IKE/IPsec NAT-T, mDNS, Wake-on-LAN

## Sources Consulted
- RFC 768 — User Datagram Protocol (https://www.rfc-editor.org/rfc/rfc768)
- RFC 8200 — IPv6 (UDP checksum requirements) (https://www.rfc-editor.org/rfc/rfc8200)
- RFC 6935 / RFC 6936 — IPv6 zero UDP checksum exceptions (background)
- RFC 9293 — TCP (header size, handshake) (https://www.rfc-editor.org/rfc/rfc9293)
- iproute2 `ss` man page (https://man7.org/linux/man-pages/man8/ss.8.html)
- nmap.org Ncat / OpenBSD nc man pages for `-u` and `-l` flags
- iperf3 documentation (https://iperf.fr/iperf-doc.php) for `-u`, `-b`, `-t`
- IANA Service Name and Transport Protocol Port Number Registry (port assignments for DNS, DHCP, NTP, SNMP, Syslog, IKE, IPsec NAT-T, mDNS, WoL)
- AMD/Intel Wake-on-LAN Magic Packet documentation (port 9 commonly used)

## Issues Found
- **"Sub-millisecond on local network" comment under the dig example was misleading.** The example queries `8.8.8.8` (Google Public DNS), which is not on a local network — realistic latency is several to tens of milliseconds. Updated the comment to clarify that sub-millisecond timing applies only to a local caching resolver, while public resolvers usually respond in a few to tens of ms.

All other technical content checks out:
- UDP header layout (8 bytes: src port, dst port, length, checksum) matches RFC 768.
- Source port "optional, can be 0" is per RFC 768.
- Length field minimum of 8 (header only) is correct.
- IPv4 checksum optional / IPv6 checksum mandatory is correct (with the niche RFC 6935/6936 exception not worth raising in a basics post).
- TCP minimum header of 20 bytes is correct.
- `nc -u`, `nc -ul`, `ss -un`, `ss -unp`, `ss -una`, `ss -ulnp` flags are all valid.
- `iperf3 -c <host> -u -b 1G -t 10` is valid syntax.
- All listed port assignments are correct (DNS 53, DHCP 67/68, NTP 123, SNMP 161, Syslog 514, IKE 500, IPsec NAT-T 4500, mDNS 5353, WoL 9).

## Review Notes
- The claim "TCP handshake overhead is 1.5 RTT" is a defensible framing (it measures wall-clock time until the third ACK reaches the server), though the more commonly cited figure is "1 RTT before the client can send data." Left as-is since it is not strictly incorrect.
- `ss -una` lists "all states" — UDP is connectionless and does not have TCP-style state, but `ss` does distinguish ESTABLISHED (with a connected peer via `connect()`) from UNCONN sockets, so the flag is meaningful. Not changed.
- WoL magic packets can also be sent to UDP port 0 or 7; port 9 is just the most common convention. Left as-is for brevity.
- `nc` behavior in UDP listen mode varies between BSD nc, GNU netcat, and ncat — readers may want to substitute `ncat -u -l 5000` if their distro ships ncat instead. Not changed because the behavior shown is correct on common Linux distros.
