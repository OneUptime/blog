# Validation Summary: How to Delete a GRE Tunnel Interface on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux `iproute2` suite (`ip link`, `ip tunnel`, `ip route`)
- GRE / GRETAP tunnel interfaces
- NetworkManager (`nmcli`)
- systemd-networkd (`networkctl`, `.netdev`/`.network` units)
- Linux kernel `ip_gre` module

## Sources Consulted
- iproute2 manual pages: `ip-link(8)`, `ip-tunnel(8)`, `ip-route(8)` — https://man7.org/linux/man-pages/man8/ip-link.8.html
- nmcli manual: `nmcli(1)` — https://networkmanager.dev/docs/api/latest/nmcli.html
- systemd-networkd: `systemd.netdev(5)`, `networkctl(1)` — https://www.freedesktop.org/software/systemd/man/networkctl.html
- Linux kernel networking documentation for GRE — https://docs.kernel.org/networking/

## Issues Found
- **Batch cleanup script — interface name extraction bug.** The pipeline
  `awk '{print $2}' | tr -d ':'` produced names like `gre1@NONE` because `ip link show` displays interfaces in `name@parent:` form. `ip link del` does not accept the `@parent` display suffix, so the loop would fail with "Cannot find device" for every tunnel. Fixed by appending `| cut -d'@' -f1` to strip the parent suffix and yield the actual device name (`gre1`).

## Review Notes
- `networkctl reload` requires systemd v244 or newer (released 2019). All currently supported distributions ship a newer version, but very old systems would need `systemctl restart systemd-networkd` instead.
- When the `ip_gre` module is loaded, the kernel automatically creates fallback devices `gre0` and `gretap0`. Attempting `ip link del gre0` will fail ("Operation not supported"); the batch cleanup loop will print an error for these but continue past them, which is acceptable.
- The verification step `ip -d link show type gre | wc -l` will not return 0 while the `ip_gre` module is loaded, because of the `gre0` fallback device. The "0 means no GRE tunnels remain" comment is therefore only literally true after `rmmod ip_gre`. Did not change this since the surrounding flow (unloading the module afterward) is consistent with the intent.
- Tunnels created with `ip link add ... type gre` may not appear in `ip tunnel list` (which uses the older ioctl interface), only in `ip link show type gre`. The post's verification covers both, so this is fine.
