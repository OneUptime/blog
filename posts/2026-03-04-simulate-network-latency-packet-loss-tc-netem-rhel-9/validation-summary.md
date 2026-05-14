# Validation Summary: How to Simulate Network Latency and Packet Loss with tc netem on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux traffic control (`tc`)
- `netem` queueing discipline
- HTB queueing discipline
- `u32` traffic filters
- Linux network namespaces

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Linux traffic control": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/linux-traffic-control_configuring-and-managing-networking
- `tc-netem(8)` manual page from the local iproute2 installation.
- `tc-netem(8)` upstream iproute2 manual page: https://man.archlinux.org/man/core/iproute2/tc-netem.8.en
- `tc-u32(8)` manual page from the local iproute2 installation.
- `tc-htb(8)` manual page from the local iproute2 installation.
- `tc qdisc add ... netem help` output from the local `tc` binary.

## Issues Found
- The jitter example described `tc ... netem delay 100ms 20ms` as using a uniform distribution. The `tc-netem(8)` documentation lists `distribution` as an explicit option and documents normal delay distribution behavior, so the inaccurate "uniform distribution" wording was removed.
- The packet-loss examples used shorthand `loss 5%` style syntax. This is commonly accepted by `tc`, but the documented syntax is `loss random PERCENT`; examples were updated to use `loss random` explicitly.
- The post recommended correlated random loss as a realistic burst-loss model. The local `tc-netem(8)` man page documents random-loss correlation as deprecated, and `tc-netem` provides state and Gilbert-Elliott models for bursty loss. The correlated random-loss examples were replaced with `loss gemodel` examples.
- The reordering example comment implied the second percentage in `reorder 25% 50%` was a delay. The `tc-netem(8)` manual defines it as correlation, so the comment was corrected.
- The wrapping-up paragraph recommended "correlation for bursty patterns" too broadly. It now recommends state or Gilbert-Elliott loss models for bursty packet-loss patterns.

## Review Notes
The examples assume the interface is named `ens192`; readers must substitute their actual interface name. Red Hat documents NETEM as available through `kernel-modules-extra` on RHEL 9, so systems without that package may need it installed before using `netem`.
