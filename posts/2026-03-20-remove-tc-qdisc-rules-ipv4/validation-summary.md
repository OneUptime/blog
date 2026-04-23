# Validation Summary: How to Remove All tc qdisc Rules from an IPv4 Interface

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `tc` / iproute2 traffic control
- Linux queuing disciplines (`qdisc`)
- Linux network interfaces and IFB devices
- Kernel networking sysctls

## Sources Consulted
- `tc(8)` upstream iproute2 man page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-pfifo_fast(8)` upstream iproute2 man page: https://www.man7.org/linux/man-pages/man8/tc-pfifo_fast.8.html
- `tc-matchall(8)` upstream iproute2 man page: https://www.man7.org/linux/man-pages/man8/tc-matchall.8.html
- `tc-mirred(8)` upstream iproute2 man page: https://www.man7.org/linux/man-pages/man8/tc-mirred.8.html
- `ip-link(8)` upstream iproute2 man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel sysctl networking documentation (`default_qdisc`): https://docs.kernel.org/admin-guide/sysctl/net.html

## Issues Found
- The post said `tc qdisc show dev eth0` should show only `noqueue` or `fq_codel` after deleting the root qdisc. I corrected this because the observed default depends on the device and kernel settings: you can see `mq`, `fq_codel`, `noqueue`, or nothing if the implicit default is `pfifo_fast`.
- The original cleanup flow omitted the `clsact` qdisc, which is a current and common way to attach ingress/egress filters. I added `clsact` removal commands and updated the all-interfaces cleanup script so the post matches its “remove all qdisc rules” claim.
- The verification section assumed `tc class show dev eth0` would always be empty after root cleanup. I corrected that to account for default multiqueue devices, which may still show default `mq` classes even after custom qdiscs are removed.
- The default-qdisc section treated `/proc/sys/net/core/default_qdisc` as the actual post-removal qdisc. I clarified that it is the system-wide default leaf qdisc, while physical multiqueue NICs commonly use `mq` at the root and virtual devices often use `noqueue`.
- The reboot guidance suggested adding cleanup before rules are applied, which would not keep the system clean if another boot-time config reapplies `tc`. I corrected that advice to remove or disable the startup configuration that recreates the rules.
- The conclusion described ingress cleanup as clearing “ingress redirect rules,” which was too narrow. I corrected it because ingress qdiscs can also host policing and other filter actions.
- The description implied the cleanup restores behavior specifically for IPv4 traffic. I corrected it to be protocol-agnostic because qdisc removal is interface-level, not IPv4-specific.

## Review Notes
- The post title and slug still use “IPv4,” but the commands and behavior described are protocol-agnostic at the interface/qdisc level.
- `pfifo_fast` remains relevant in upstream documentation as an implicit default, but many modern systems use `fq_codel` or another configured default instead.
