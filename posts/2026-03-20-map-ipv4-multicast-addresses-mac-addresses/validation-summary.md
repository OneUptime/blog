# Validation Summary: How to Map IPv4 Multicast Addresses to MAC Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 multicast
- Ethernet multicast MAC addressing
- Linux `iproute2` (`ip maddr`)
- Python 3 (`ipaddress`, `socket`)

## Sources Consulted
- RFC 1112, section 6.4, "Host Extensions for IP Multicasting": https://datatracker.ietf.org/doc/rfc1112/
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html
- Python standard library documentation for `socket`: https://docs.python.org/3/library/socket.html
- Linux `ip(7)` man page for `IP_ADD_MEMBERSHIP`: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `ip-maddress(8)` man page for `ip maddr show`: https://man7.org/linux/man-pages/man8/ip-maddress.8.html
- Local command help for `ip maddr` and a live Linux verification using `IP_ADD_MEMBERSHIP` to confirm the joined group appeared with MAC `01:00:5e:01:02:03`

## Issues Found
- The introduction implied that the switch chooses the multicast MAC address. I changed the sentence to say that Ethernet multicast frames use a multicast destination MAC instead of the broadcast MAC, which is the technically correct framing.
- The manual bit-walkthrough said to "drop the high bit of each octet pair," which was inaccurate and confusing. I corrected it to state that the low 23 bits are the low 7 bits of octet 2 plus all of octets 3 and 4, matching RFC 1112.
- The Linux verification example used `IP_ADD_MEMBERSHIP` with `0.0.0.0`, which lets Linux choose the interface automatically, but the next command hard-coded `eth0`. I changed the command to `ip maddr show` so the example remains correct regardless of which interface Linux selects.
- The 32-to-1 ambiguity section claimed each MAC maps from 32 IPv4 multicast addresses, but the example list showed only 16 addresses by varying the first octet. I added the second 16-address set where the ignored high bit of the second octet is toggled, completing the 32-address collision class.

## Review Notes
- The Python helper correctly computes the Ethernet MAC for multicast addresses using `IPv4Address.packed`. It does not explicitly reject non-multicast IPv4 input, but the surrounding post clearly scopes the function to multicast group addresses.
- The Linux verification commands are Linux-specific by design and are accurate for `iproute2`-based systems.
