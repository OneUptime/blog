# Validation Summary: How to Set Up Network Bonding (Link Aggregation) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (server networking)
- Netplan (YAML network configuration)
- systemd-networkd (renderer backend)
- Linux kernel bonding driver
- iproute2 (`ip link`)
- LACP / IEEE 802.3ad
- modprobe / kernel modules

## Sources Consulted
- Netplan YAML reference (bond properties): https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Linux Ethernet Bonding Driver HOWTO (kernel.org): https://www.kernel.org/doc/html/latest/networking/bonding.html
- Netplan CLI reference: https://netplan.readthedocs.io/en/stable/reference/
- Netplan FAQ: https://netplan.io/faq
- Ubuntu packages — ifenslave: https://packages.ubuntu.com/jammy/ifenslave

## Issues Found
1. **`ifenslave` listed as a required install.** With Netplan + systemd-networkd (the standard Ubuntu 22.04/24.04 setup), `ifenslave` is not required — it depends on `ifupdown` and is only relevant for the legacy `/etc/network/interfaces` workflow. Replaced the `sudo apt install ifenslave` block with a short note clarifying that no extra packages are needed and that `ifenslave` only applies to the legacy approach.
2. **Sample `/proc/net/bonding/bond0` output showed `primary_reselect failure`.** The kernel default for `primary_reselect` is `always` (value 0), and the Netplan config in the post does not override it, so the displayed value was inconsistent with the configuration. The post also tells the reader that "after restoration, eth0 should become primary again" — behavior that only matches the `always` policy. Changed the sample output to `primary_reselect always`.

## Review Notes
- Bonding mode table (modes 0-6) matches the kernel bonding documentation.
- All Netplan bond parameters used (`mode`, `mii-monitor-interval`, `primary`, `lacp-rate`, `transmit-hash-policy`) are valid and map correctly to kernel parameters (`miimon`, `lacp_rate`, `xmit_hash_policy`).
- `mode` string values (`active-backup`, `802.3ad`, `balance-rr`) are all accepted by Netplan.
- Netplan CLI usage (`netplan generate`, `netplan apply`, `netplan --debug apply`) is correct. The post could optionally mention `netplan try`, which applies changes with auto-revert on loss of connectivity — useful for the "remote connection" warning the post raises — but this is an enhancement, not a correction.
- `options bonding debug=1` in `/etc/modprobe.d/bonding.conf` is a valid bonding module option.
- The bonding driver version `v5.15.0` in the sample output corresponds to Ubuntu 22.04's default kernel. Still accurate but readers on Ubuntu 24.04 will see a 6.x version string.
- Terminology note: the post uses "slaves" throughout, which still matches the wording in `/proc/net/bonding/*` and `bonding.rst`, though some upstream networking docs are moving toward "ports". Not a correctness issue.
