# Validation Summary: How to Understand 6LoWPAN (IPv6 over Low-Power Wireless Personal Area Networks)

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- 6LoWPAN
- IPv6
- IEEE 802.15.4
- Linux `ieee802154` / 6LoWPAN support
- `iproute2`
- `wpan-tools` / `iwpan`
- Thread
- Matter-over-Thread

## Sources Consulted
- RFC 4944, "Transmission of IPv6 Packets over IEEE 802.15.4 Networks" - https://www.rfc-editor.org/rfc/rfc4944.html
- RFC 6282, "Compression Format for IPv6 Datagrams over IEEE 802.15.4-Based Networks" - https://www.rfc-editor.org/rfc/rfc6282.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200.html
- Linux-wpan documentation - https://linux-wpan.org/documentation.html
- Linux-wpan supported hardware list - https://linux-wpan.org/hardware.html
- Linux kernel source for `6LOWPAN` and `IEEE802154_6LOWPAN` - https://github.com/torvalds/linux/tree/master/net/6lowpan and https://github.com/torvalds/linux/tree/master/net/ieee802154/6lowpan
- `iproute2` `ip-link` manual source with the `lowpan` link example - https://github.com/iproute2/iproute2/blob/main/man/man8/ip-link.8.in
- `wpan-tools` source for `iwpan phy ... set channel`, `iwpan dev ... set pan_id`, and `iwpan dev ... set short_addr` - https://github.com/linux-wpan/wpan-tools/blob/master/src/phy.c and https://github.com/linux-wpan/wpan-tools/blob/master/src/mac.c
- Google Home Developers Matter primer on Thread and IPv6 - https://developers.home.google.com/matter/primer/thread-and-ipv6

## Issues Found
- The post said IEEE 802.15.4 link-layer security adds "21+ bytes". I changed this to "up to 21 bytes" to match RFC 4944.
- The architecture diagram implied fragmentation and compression are functions of the border router itself. I changed the label to describe its actual role as the IPv6-to-802.15.4 boundary.
- The header-compression section used the looser term `IPHC`, said the header can be compressed to "2-3 bytes", and oversimplified which fields are elided. I changed this to `LOWPAN_IPHC`, corrected the best-case size to 2 bytes, and clarified the conditions from RFC 6282.
- The fragmentation section said every fragment has a 4-byte header containing size, tag, and offset. I corrected this to reflect RFC 4944: the first fragment uses 4 bytes, while subsequent fragments use 5 bytes because they also carry the offset.
- The mesh-addressing section implied frames are forwarded only toward a border router. I widened this to cover forwarding toward another 6LoWPAN node or a border router.
- The dispatch table was inaccurate. I changed the section wording so it no longer says every packet starts with a dispatch byte, and I corrected the bit patterns for NALP, uncompressed IPv6, LOWPAN_IPHC, mesh headers, FRAG1, and FRAGN.
- The Linux example listed `cc2531` as a sample 802.15.4 device. I replaced it with `mcr20a` because the Linux-wpan hardware list does not mark `cc2531` as supported hardware for this stack.
- The Linux example comment said the command sequence "assigns" an IPv6 address, but the command only inspects the automatically generated link-local address. I corrected the wording.
- The node configuration snippet brought up only `lowpan0`. I added `ip link set wpan0 up` so the example includes the underlying interface state needed for operation.
- The module probe example used `modprobe -v lowpan`. I corrected it to `modprobe -v ieee802154_6lowpan` to match upstream kernel module naming.
- The conclusion said 6LoWPAN is the foundation for Matter in general. I narrowed this to Matter deployments that run over Thread.

## Review Notes
- The Linux commands are valid for systems with upstream 802.15.4 / 6LoWPAN support, but actual device names such as `phy0`, `wpan0`, and `lowpan0` remain system-specific.
- Some distributions build 6LoWPAN support into the kernel or autoload it when `ip link add ... type lowpan` is used, so the module-loading step is only one way to confirm support.
