# Validation Summary: How to View the ARP Table with ip neigh

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux `ip neigh` command (iproute2)
- ARP / Neighbor Unreachability Detection (NUD) states
- Legacy `arp` command comparison
- Shell utilities: `awk`, `ping`, `python3 -m json.tool`

## Sources Consulted
- `man ip-neighbour` (iproute2 manual page)
- iproute2 source: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git
- Linux kernel `include/uapi/linux/neighbour.h` for NUD_* state constants
- RFC 826 (ARP), RFC 4861 (IPv6 Neighbor Discovery)
- Linux kernel documentation on neighbor subsystem

## Issues Found
- The comment `# Include interface index` above the `awk '{print $1, $3, $5}'` command was misleading — field `$3` in `ip neigh show` output is the interface **name** (e.g., `eth0`), not the numeric interface index. Changed the comment to `# Print only IP, interface name, and MAC columns` to accurately describe what the awk command produces.

## Review Notes
- The list of NUD states is not exhaustive — `INCOMPLETE` and `NONE` are also valid states defined in the Linux kernel (`NUD_INCOMPLETE`, `NUD_NONE`). The states listed are all correct; the table is simply a subset. Not fixed because adding rows would expand scope beyond error correction.
- `ip neigh show 192.168.1.1` works because `to PREFIX` is the implicit default argument; the full form is `ip neigh show to 192.168.1.1`. Both are valid.
- `ip -json neigh show` is valid — iproute2 accepts both `-j` and `-json` for JSON output.
- The NOARP description ("direct route, no MAC needed") is a simplification. NOARP typically applies to interfaces that don't use ARP at all (loopback, PPP, tunnels) rather than merely indicating a direct route. Not reworded because the simplified description is reasonable for a reference post and rewording would be stylistic.
- The claim that `arp` is deprecated in favor of `ip neigh` is accurate — net-tools has been deprecated in favor of iproute2 on most modern Linux distributions, though some distros still ship both packages.
