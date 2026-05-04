# Validation Summary: How to Create a Bond with ip link add type bond

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux kernel bonding driver
- iproute2 (`ip link`, `ip addr`, `ip route`)
- IEEE 802.3ad LACP
- Linux network interfaces (`/proc/net/bonding/`)
- Netplan / `/etc/network/interfaces` (mentioned briefly)

## Sources Consulted
- Linux kernel networking documentation: `Documentation/networking/bonding.rst`
- Linux UAPI bonding header: `include/uapi/linux/if_bonding.h` (mode constants)
- iproute2 source: `ip/iplink_bond.c` (parser grammar for `type bond` arguments)
- `ip-link(8)` man page (master/nomaster, type-specific args)
- `ip link help bond` runtime output (iproute2 6.x)

## Issues Found
- **Bonding modes table was incomplete (factual omission).** The table headed "Available bonding modes" listed modes 0, 1, 2, 4, 5, 6 but omitted mode 3 (`broadcast`), which is a valid kernel bonding mode (`BOND_MODE_BROADCAST` in `if_bonding.h`). Since the heading implies completeness, this was misleading. Added a row for mode 3 / `broadcast` / "Transmits everything on all slave interfaces" (description taken from `bonding.rst`).

## Review Notes
- All `ip link` syntax in the post is correct and current. `ip link add ... type bond`, `ip link set ... type bond mode ...`, `master`/`nomaster`, and `ip link del` are all valid.
- LACP parameter values are accurate: `fast` = 1-second LACPDU interval, `slow` = 30-second; `miimon` is indeed milliseconds.
- The two-step "create then set mode" pattern (`ip link add bond0 type bond` followed by `ip link set bond0 type bond mode 802.3ad`) is syntactically valid and works because the post sets the mode while the bond is freshly created with no slaves and is administratively down. The kernel rejects mode changes on a bond that has slaves attached or is up; this is not a problem given the post's ordering.
- Caveat the post does not mention: in the "Setting LACP Parameters" section, `lacp_rate` is shown being applied after the bond has been brought up and enslaved — depending on kernel version, changing `lacp_rate` may require the bond to be down or have no slaves. The user may need to take the bond down before changing LACP parameters in production. Not corrected as the commands themselves are syntactically correct and the post is positioned as introductory.
- The terminology "slave"/"enslave" is still used in kernel documentation, sysfs (`/sys/class/net/bond0/bonding/slaves`), and `/proc/net/bonding/`, so it remains technically accurate even though the broader Linux ecosystem is gradually adopting alternative terms.
- The default bonding mode when none is specified at creation is `balance-rr` (mode 0), per `bonding.rst`. The post implicitly handles this by setting the mode in a follow-up command.
