# Validation Summary: How to Set Ageing Time on a Linux Bridge

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Linux bridge
- Forwarding database (FDB)
- iproute2 `ip` and `bridge` commands
- bridge-utils `brctl`
- sysfs bridge attributes
- systemd-networkd `.netdev` bridge configuration
- Debian `/etc/network/interfaces` bridge-utils extensions

## Sources Consulted
- Linux kernel Ethernet Bridging documentation: https://kernel.org/doc/html/next/networking/bridge.html
- Linux bridge sysfs implementation (`br_sysfs_br.c`): https://android.googlesource.com/kernel/common.git/+/b47711bfbcd4eb77ca61ef0162487b20e023ae55/net/bridge/br_sysfs_br.c
- iproute2 `iplink_bridge.c` source mirror from kernel.org Git: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/refs/heads/main/ip/iplink_bridge.c
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- `brctl(8)` manual page: https://man7.org/linux/man-pages/man8/brctl.8.html
- `systemd.netdev(5)` manual page: https://man7.org/linux/man-pages/man5/systemd.netdev.5.html
- Debian `bridge-utils-interfaces(5)` manual page: https://manpages.debian.org/testing/bridge-utils/bridge-utils-interfaces.5.en.html
- Local tool output: `ip -V`, `ip link help bridge`, `bridge fdb help`, and `getconf CLK_TCK`

## Issues Found
- The sysfs `ageing_time` example described the value as jiffies. Linux bridge timer values exposed through this path are converted with `jiffies_to_clock_t`, so the user-facing value is in `clock_t` / USER_HZ ticks. Updated the wording and example comments.
- The `ip link` section said "in seconds" while using the raw `ageing_time 6000` value. Linux bridge netlink timer attributes are `clock_t` values, and iproute2 passes the value through as the raw attribute. Updated the comments to say clock ticks / USER_HZ.
- The `brctl` section presented `brctl` without deprecation context. `brctl(8)` documents the command as obsolete in favor of iproute2, so a legacy note was added.
- `bridge fdb show br br0` was labeled as showing entries with age, but `bridge(8)` requires `-statistics` / `-s` to print last-used and last-updated time. Updated the command to `bridge -s fdb show br br0`.
- `bridge fdb flush dev br0` was labeled as flushing dynamic entries, but the current `bridge fdb flush` command supports an explicit `dynamic` selector. Updated the command and key takeaway to `bridge fdb flush dev br0 dynamic`.
- The live VM migration wording implied ageing time accelerates MAC move detection. Bridge learning updates FDB entries from received source MACs; ageing time mainly limits how long stale entries persist when no refreshing traffic is seen. Updated the wording to "shorter stale-entry lifetime."

## Review Notes
`brctl setageing` remains syntactically correct for systems that still ship bridge-utils, but iproute2 is the modern interface. The raw `ip link ... ageing_time` value is USER_HZ-scaled on common systems; `getconf CLK_TCK` can confirm the local scale.
