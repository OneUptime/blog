# Validation Summary: How to Configure Active-Backup Bonding for High Availability on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager and nmcli
- Linux bonding driver
- Active-backup bonding
- MII and ARP link monitoring
- Shell monitoring script

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- Linux Ethernet Bonding Driver HOWTO: https://docs.kernel.org/networking/bonding.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local nmcli help output from NetworkManager 1.46.0
- Local `modinfo bonding` output for Linux bonding module parameters

## Issues Found
- The slave interface commands used the deprecated `master` alias. Updated them to the current NetworkManager terminology: `port-type bond controller bond0`.
- The bond activation sequence did not set `connection.autoconnect-ports`. Added `nmcli connection modify bond0 connection.autoconnect-ports 1`, matching current RHEL 9 documentation so the bond's port profiles are activated with the controller.
- The `primary_reselect=better` explanation incorrectly said it only uses the primary on initial setup and never switches back. Updated it to say the primary is reselected only when it has better speed and duplex than the current active slave.
- The `primary_reselect=failure` explanation incorrectly said it never switches back after failover. Updated it to say the primary is reselected only if the current active slave fails and the primary is up.
- The failover test language described `nmcli device disconnect` as a simulated link failure and promised uninterrupted traffic. Updated it to describe this as disconnecting the active interface and verifying connectivity through the backup.
- The cross-switch claim said active-backup is the only standard bonding mode that works without special switch configuration. Updated the wording to avoid the inaccurate absolute claim while preserving the intended HA guidance.

## Review Notes
- The ARP monitoring example is technically valid, but production deployments often use multiple ARP targets and may need `arp_validate` depending on topology.
- The monitoring script assumes MII status output from `/proc/net/bonding/bond0`; it is appropriate for the MII-focused configuration shown in the post.
