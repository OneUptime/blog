# Validation Summary: How to Set Up MacVLAN Interfaces on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux MacVLAN driver (kernel network driver)
- iproute2 (`ip link`, `ip addr`, `ip route`)
- Netplan (Ubuntu network configuration tool)
- systemd-networkd (`.netdev`, `.network` units, `networkctl`)
- DHCP on MacVLAN child interfaces
- ipvlan (mentioned as an alternative)

## Sources Consulted
- [Netplan YAML configuration reference](https://netplan.readthedocs.io/en/latest/netplan-yaml/) — to confirm the set of supported top-level device-type keys
- [Netplan documentation](https://netplan.readthedocs.io/) — general reference
- [systemd.netdev(5) man page](https://www.freedesktop.org/software/systemd/man/systemd.netdev.html) — `Kind=macvlan`, `[MACVLAN]` section, `Mode=` values
- [systemd.network(5) man page](https://www.freedesktop.org/software/systemd/man/systemd.network.html) — `MACVLAN=` directive on parent, `DHCP=` on child
- [ip-link(8) man page](https://man7.org/linux/man-pages/man8/ip-link.8.html) — `type macvlan mode {private|vepa|bridge|passthru|source}` syntax
- [Docker macvlan network driver docs](https://docs.docker.com/engine/network/drivers/macvlan/) — confirmation of the standard host-to-MacVLAN shim workaround
- [blog.oddbit.com: Using Docker macvlan networks](https://blog.oddbit.com/post/2018-03-12-using-docker-macvlan-networks/) — additional reference for the shim-interface pattern

## Issues Found

1. **Netplan section claimed a `macvlans:` top-level key that does not exist.** The post showed a netplan YAML using `macvlans:` as a top-level device type. The current netplan schema supports only: `ethernets`, `bonds`, `bridges`, `dummy-devices`, `modems`, `tunnels`, `virtual-ethernets`, `vlans`, `vrfs`, `wifis`, and `nm-devices` — there is no `macvlans` key. Applying the YAML as written would fail. **Fix:** rewrote the "Persistent Configuration with Netplan" section to state that netplan does not expose MacVLAN, list the actual supported device types, and direct readers to drop a systemd-networkd snippet alongside their netplan config (which netplan will leave in place when using the `networkd` renderer).

2. **"Using MacVLAN with DHCP" example also used the non-existent `macvlans:` key.** Same root cause. **Fix:** replaced the netplan YAML with a small systemd-networkd `.network` snippet using `DHCP=yes`, and noted that the `.netdev` and parent-interface `MACVLAN=` files from the previous section are still needed.

3. **Host-to-MacVLAN workaround was incorrect.** The original suggested `ip route add 192.168.1.150/32 dev macvlan0` (routing through the very interface that the kernel will not let the host talk to) and `ip addr add 192.168.1.150/32 dev lo` (assigning the child's IP onto loopback, which conflicts with the IP already on `macvlan0`). Neither solves the parent-cannot-talk-to-child kernel restriction. **Fix:** replaced with the canonical shim-interface workaround — create a second MacVLAN child on the same parent, give it a `/32` in the same subnet, bring it up, and route the target child's IP through the shim. This is the pattern Docker, Podman, and the kernel networking community document.

4. **Cleanup section referred to "netplan/networkd files" but only listed networkd files.** Minor wording fix to reflect that, after the rewrite, only systemd-networkd files exist to remove.

## Review Notes

- **MacVLAN modes:** The post lists four modes (private, vepa, bridge, passthru). Newer kernels (≥4.5) also support a fifth, `source` mode (MAC-based filtering for VFs). I left this alone — the omission is a simplification, not an error, and the four documented modes are the ones used in virtually all real-world setups.
- **`MACVLAN=` on the parent network unit:** This is correct, but it intentionally leaves `eth0` without an IP unless the reader adds DHCP/Address directives. The post does not promise otherwise, so no change.
- **Ubuntu 18.04 reference:** "Ubuntu 18.04 and later" is now stale advice (18.04 reached end of standard support in 2023), but the underlying technical claim — that netplan ships on those releases — is still true. Left untouched because the task scopes changes to technical correctness.
- **Description front-matter:** Still mentions "persistent configuration with netplan and systemd-networkd". Strictly speaking, after the fixes netplan is no longer used for the MacVLAN itself, but the post does still discuss netplan's role and how it coexists with networkd, so the description is not actively wrong. Left as-is to respect the "do not restructure" constraint.
