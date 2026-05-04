# Validation Summary: How to Create a Bridge with ip link add type bridge

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux networking
- iproute2 (`ip` and `bridge` commands)
- Linux kernel software bridge driver
- Spanning Tree Protocol (STP, IEEE 802.1D)

## Sources Consulted
- ip-link(8) man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- bridge(8) man page (iproute2)
- Linux kernel `net/bridge/br_netlink.c` and `br_stp_if.c` (IFLA_BR_* attributes, range constants `BR_MIN_FORWARD_DELAY`, `BR_MAX_FORWARD_DELAY`, `BR_MIN_HELLO_TIME`, `BR_MAX_HELLO_TIME`, `BR_MIN_MAX_AGE`, `BR_MAX_MAX_AGE`)
- IEEE 802.1D Spanning Tree Protocol specification

## Issues Found
No technical issues found.

All commands verified:
- `ip link add name br0 type bridge` — correct syntax for creating a bridge link.
- `ip link set <iface> master br0` / `ip link set <iface> nomaster` — correct way to enslave/detach an interface.
- `ip addr flush dev <iface>` before enslaving — correct best practice (slaves should not carry IPs).
- `ip addr add 192.168.1.10/24 dev br0` and `ip route add default via 192.168.1.1` — correct syntax.
- `ip link show type bridge`, `bridge link show`, `bridge fdb show dev br0` — correct verification commands.
- `ip link set br0 type bridge stp_state 1` / `0` — correct STP enable/disable.
- `forward_delay 400`, `hello_time 200`, `max_age 2000` — kernel exposes these via netlink as `clock_t` (centiseconds, with USER_HZ=100). Values map to 4s, 2s, and 20s respectively, all inside the kernel's enforced ranges (forward_delay 2–30 s, hello_time 1–10 s, max_age 6–40 s). The "default 15 seconds" comment for forward_delay matches the kernel default of 1500 centiseconds.
- `ip link set br0 down` followed by `ip link delete br0` — correct teardown.

## Review Notes
- The post mixes unit annotations: `hello_time` is correctly labelled "centiseconds", but `forward_delay` only mentions the default in seconds and `max_age` has no unit comment. All three parameters use the same unit (centiseconds via `clock_t` netlink encoding), so consistent labelling would help readers, but the values shown are valid and the existing wording is not inaccurate.
- The example values for forward_delay (4 s) combined with the default max_age (20 s) do not satisfy the IEEE 802.1D recommendation `2*(forward_delay-1) >= max_age` (would need forward_delay ≥ 11 s for max_age=20 s). The kernel only enforces simple per-parameter min/max ranges, not the cross-parameter relationship, so each command runs successfully on its own. A future revision could note this constraint when tuning STP timers together.
- The post correctly states that the bridge device — not its members — should hold the IP address, which is the standard configuration for Linux software bridges.
