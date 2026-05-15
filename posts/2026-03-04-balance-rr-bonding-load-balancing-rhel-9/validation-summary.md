# Validation Summary: How to Configure Balance-RR Bonding for Load Balancing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux bonding driver
- NetworkManager and nmcli
- balance-rr bonding mode
- iperf3
- Linux networking diagnostics with ss, ip, and /proc/net/bonding

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a network bond by using nmcli - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Upstream switch configuration depending on bonding modes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Linux kernel documentation: Linux Ethernet Bonding Driver HOWTO - https://docs.kernel.org/networking/bonding.html
- NetworkManager nm-settings-nmcli reference: bond.options - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local nmcli and NetworkManager man pages for connection properties and aliases.

## Issues Found
- The slave-interface `nmcli` examples used the older `master` form. Red Hat's current RHEL 9 documentation for RHEL 9.4 and later uses `port-type bond` and `controller bond0`, so the examples were updated to match current documented syntax.
- The throughput testing section said a single TCP stream would only use one slave effectively. That is true for hash-based aggregation such as 802.3ad, but not for balance-rr. The Linux bonding documentation states that balance-rr is the mode that can stripe a single TCP/IP connection across multiple interfaces, with packet reordering as the trade-off. The testing text and commands were corrected accordingly.

## Review Notes
- The post's claims about balance-rr requiring static EtherChannel/trunking, not LACP, match Red Hat's RHEL 9 documentation.
- The `packets_per_slave` option, default value of 1, valid range, and balance-rr-only behavior match the Linux kernel bonding documentation.
- Red Hat notes that software deactivation tools such as `nmcli` do not fully simulate physical link failure events. The failover example is still useful as a configuration test, but a future post could distinguish software disconnect tests from real cable or switch-port failure tests.
