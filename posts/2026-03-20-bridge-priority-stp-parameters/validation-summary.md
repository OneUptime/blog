# Validation Summary: How to Configure Bridge Priority and STP Parameters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bridge
- Spanning Tree Protocol (STP)
- `brctl` / bridge-utils
- `ip link` / iproute2
- `bridge` / iproute2
- `systemd-networkd`

## Sources Consulted
- Linux kernel bridge documentation: https://docs.kernel.org/6.15/networking/bridge.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `brctl(8)` manual page: https://man7.org/linux/man-pages/man8/brctl.8.html
- `systemd.netdev(5)` manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network(5)` manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Linux kernel source for bridge path-cost defaults: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/net/bridge/br_if.c
- Linux kernel source for STP bridge/port priority handling: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/net/bridge/br_stp_if.c
- Linux kernel source for default bridge priority initialization: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/net/bridge/br_device.c

## Issues Found
- The post used `brctl setportcost`, which is not the documented bridge-utils command. I changed it to `brctl setpathcost` to match `brctl(8)`.
- The default path-cost examples were incorrect for current Linux bridge behavior. I updated them to the values implemented in the kernel bridge code for common speeds: 10Mbps `100`, 100Mbps `19`, 1Gbps `5`, and 10Gbps `2`.
- The port-priority section said the usable range was `0-255`, used `64` in examples, and claimed a default of `128`. Current Linux bridge behavior uses a default port priority of `32`, and `ip link` documents a valid range of `0-63`; I corrected the range, default, and both examples.
- The STP timer examples for `ip link` used centisecond-style values such as `hello_time 200`. The `ip-link(8)` interface documents these values in seconds, so I corrected them to `2`, `20`, and `15`.
- The post claimed that enabling STP with `ip link ... stp_state 1` automatically enables RSTP. The Linux kernel bridge documentation only documents this as enabling STP participation and invoking the bridge STP helper; it does not state that this command alone selects RSTP. I changed the section heading and explanation accordingly.
- The post said bridge priority "must" be a multiple of `4096` and implied that any value below `32768` makes a bridge the root bridge. Linux bridge exposes bridge priority as a `0-65535` value, and root election depends on all competing bridges, so I corrected those statements to describe the actual Linux behavior without overstating guarantees.

## Review Notes
- `brctl` is documented as obsolete in `brctl(8)`. The commands in the post are still useful for legacy environments, but current Linux tooling favors `ip link` and `bridge`.
- Linux documentation is slightly inconsistent on raw STP port-priority representation in older manuals versus current kernel/iproute2 behavior. The updated post reflects current kernel source and `ip-link(8)` behavior.
