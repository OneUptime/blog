# Validation Summary: How to Configure Network Bonding on RHEL Using nmcli

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager
- nmcli
- Linux network bonding
- IPv4 addressing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring a network bond by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- NetworkManager nmcli local help output from nmcli 1.46.0
- Linux kernel documentation, "Linux Ethernet Bonding Driver HOWTO": https://docs.kernel.org/networking/bonding.html

## Issues Found
- The bond member commands used `master bond0` without specifying a bond port/slave type. Current nmcli rejects this form because a controller cannot be set without a port type. Updated the commands to use the current RHEL 9.4+ syntax: `port-type bond` and `controller bond0`.
- The post stated that NetworkManager automatically brings up the slave connections when the bond activates. Red Hat documents that automatic port activation should be enabled with `connection.autoconnect-ports 1`. Added that command before activating the bond and adjusted the explanation.
- The removal commands still referenced the old connection names. Updated them to delete `bond0-port1` and `bond0-port2`, matching the corrected creation commands.
- Added a prerequisite note that the shown `port-type` and `controller` options apply to RHEL 9.4 or later, because Red Hat documents those options as introduced in RHEL 9.4.

## Review Notes
The remaining commands and explanations are consistent with the Red Hat RHEL 9 bonding procedure and Linux bonding driver documentation. The article uses public DNS resolver examples and RFC 1918 addressing for demonstration; production deployments should substitute site-specific IP, gateway, DNS, and interface names.
