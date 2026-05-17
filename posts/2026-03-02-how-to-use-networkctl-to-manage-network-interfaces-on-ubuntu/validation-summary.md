# Validation Summary: How to Use networkctl to Manage Network Interfaces on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- networkctl (systemd CLI)
- systemd-networkd
- Ubuntu (server + cloud images)
- Netplan
- systemd-resolved (resolvectl)
- LLDP (Link Layer Discovery Protocol)
- DHCP
- ip (iproute2)

## Sources Consulted
- networkctl(1) man page (systemd 255)
- systemd.network(5) man page
- systemd-networkd documentation: https://www.freedesktop.org/software/systemd/man/networkctl.html
- systemd.network documentation: https://www.freedesktop.org/software/systemd/man/systemd.network.html

## Issues Found

1. **Incorrect `off` operational state description.** The post described `off` as "no carrier (cable unplugged or interface is down)", but per `networkctl(1)`, `off` means "the device is powered down" (administratively down). The "cable unplugged" semantic belongs to `no-carrier`. Updated both descriptions to match the official definitions.

2. **Non-existent `networkctl show` command.** The post recommended `networkctl show eth0` to dump all interface properties, but `networkctl` has no `show` subcommand (verified against the `networkctl(1)` man page command list: list, status, lldp, label, delete, up, down, renew, forcerenew, reconfigure, reload, edit, cat). Replaced the example with `ip -d link show eth0`, which actually does dump detailed kernel link properties.

3. **`networkctl renew` without arguments.** The post showed `sudo networkctl renew` (no arguments) as a way to "renew all DHCP-configured interfaces". Per the man page, `renew DEVICE...` requires one or more device arguments. Replaced the example with a multi-device invocation (`sudo networkctl renew eth0 eth1`) and a note that one or more device names are required.

## Review Notes

- The post correctly places `RequiredForOnline=` under the `[Link]` section (verified against systemd.network(5)).
- `--json=` accepts `short`, `pretty`, or `off` — correct.
- `LLDP=` accepts boolean or `routers-only`; `EmitLLDP=` accepts `no`/`yes`/`nearest-bridge`/`non-tpmr-bridge`/`customer-bridge`. Both example values used in the post are valid.
- The note that `networkctl down` "sets the activation policy of the interface" is slightly imprecise — `down` brings the link administratively down; the activation policy in the `.network` file governs whether networkd brings it back up after reload/reconfigure. The practical effect described is correct, so it was left as-is.
- The list of operational and setup states is a useful subset of the full enumeration (the full list also includes `missing`, `degraded-carrier`, `enslaved` for operational and `pending`, `initialized`, `linger` for setup), but listing only the common states is reasonable for a how-to.
- `networkctl up`/`down` were added in systemd v246; `renew` in v244; `reconfigure`/`reload` in v244. Ubuntu 22.04+ ships systemd 249+ so all examples are compatible with currently supported Ubuntu versions.
