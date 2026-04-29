# Validation Summary: How to Join a Multicast Group on a Linux Interface

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux IPv4 multicast
- IGMP and IGMPv3
- Python `socket` multicast APIs
- Linux `iproute2` (`ip maddr`)
- `tcpdump`
- `net-tools` `netstat`
- `/proc/net/igmp`

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `ip-maddress(8)` manual page: https://man7.org/linux/man-pages/man8/ip-maddress.8.html
- Linux `netstat(8)` manual page: https://man7.org/linux/man-pages/man8/netstat.8.html
- RFC 1112, Host Extensions for IP Multicasting: https://www.rfc-editor.org/rfc/rfc1112
- RFC 9776, Internet Group Management Protocol, Version 3: https://www.rfc-editor.org/rfc/rfc9776.html
- Local command validation: `ip maddr help`, `ip maddr show`, `netstat -g`, and live `/proc/net/igmp` output on Linux

## Issues Found
- The post described `ip maddr add/del` as a way to join or remove an IPv4 multicast group. I changed that section to inspection-focused and noted that `ip maddr add/del` only manages static link-layer multicast filter entries, not protocol-level IGMP joins.
- The socket examples implied that `0.0.0.0` joins "all interfaces". I corrected that wording to reflect Linux and RFC behavior: an unspecified interface means the kernel chooses the default/appropriate interface, and joining multiple interfaces requires separate memberships.
- The "specific interface" Python example bound the socket to the interface's unicast IPv4 address. I changed it to bind to `('', port)` because multicast packets are addressed to the group, while the interface choice belongs in the `IP_ADD_MEMBERSHIP` request. I also verified this behavior with a local loopback multicast test.
- The `/proc/net/igmp` parser example did not match the actual file layout and would not correctly print group memberships. I rewrote the sample to track interface header lines and decode continuation lines properly.
- The `/proc/net/igmp` example hex value was incorrect. I changed the sample from `EF000001` to `010000EF` so the documented little-endian decode matches `239.0.0.1`.
- The conclusion overstated IGMP behavior by implying a guaranteed report/leave path to both routers and switches. I softened that language to "may send" and described `IP_DROP_MEMBERSHIP` as dropping the socket's membership cleanly.
- `netstat -g` was presented as a normal verification command without caveat. I marked it as a legacy `net-tools` alternative because the Linux `netstat(8)` page documents `ip maddr` as its replacement for multicast group display.

## Review Notes
- Python documents `socket.IP_ADD_SOURCE_MEMBERSHIP` as a Linux constant added in Python 3.12. The example is correct on current Python, but older Python releases may not expose that constant even when the kernel supports the underlying socket option.
- `ip maddr show` is useful for inspection, but it shows multicast addresses associated with interfaces; it is not itself the API that performs an IPv4 IGMP join.
