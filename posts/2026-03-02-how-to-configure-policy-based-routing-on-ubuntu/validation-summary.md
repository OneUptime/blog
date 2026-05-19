# Validation Summary: How to Configure Policy-Based Routing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking
- Linux policy-based routing
- iproute2 (`ip rule`, `ip route`)
- Routing tables (`/etc/iproute2/rt_tables`)
- Netfilter / iptables packet marks
- Netplan routing policy
- systemd oneshot services
- Linux IPv4 `rp_filter` sysctl

## Sources Consulted
- ip-rule(8), Linux manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- ip-route(8), Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iptables-extensions(8), Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- IP Sysctl, Linux kernel documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Netplan reference documentation: https://canonical-netplan.readthedocs-hosted.com/
- systemd.service(5), freedesktop.org manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The persistence section referred to "Netplan's routing hooks." Netplan documents route table configuration through `routes` and policy rules through `routing-policy`, so the wording was corrected.
- The debugging section recommended `ip route show cache` to monitor routing cache hits. Linux removed the IPv4 routing cache in kernel 3.6, and the ip-route manual says cached route output is empty on newer kernels. The command was changed to `ip monitor route`.
- The `rp_filter` section stated that Ubuntu enables reverse path filtering by default. The Linux kernel documentation says the kernel default is 0 and notes that some distributions enable it in startup scripts, so the statement was made distribution-neutral.

## Review Notes
The remaining `ip rule`, `ip route`, iptables MARK, systemd oneshot, and Netplan terminology matched the consulted documentation. The post uses documentation-only example IPv4 ranges from RFC 5737, so readers must replace those addresses with real interface and gateway values in an actual deployment.
