# Validation Summary: How to Migrate from Network Teaming to Bonding on RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager and nmcli
- NIC teaming, teamd, teamdctl, and team2bond
- Linux bonding driver
- VLAN tagging
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: Configuring a network bond: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 Configuring and managing networking: Configuring a NIC team and migrating a NIC team configuration to network bond: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-teaming_configuring-and-managing-networking
- Red Hat Enterprise Linux 9.2 Release Notes, deprecated networking functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.2_release_notes/deprecated-functionality
- NetworkManager nmcli help output from local nmcli 1.46.0.
- teamdctl manual page: https://man.archlinux.org/man/teamdctl.8.en
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The opening sentence said teaming was deprecated starting with "RHEL" without naming the major version. Updated it to "RHEL 9" to match Red Hat's release notes.
- The team runner mapping omitted the `random` runner, which Red Hat documents as an available team runner. Added a row noting that it has no direct bonding equivalent.
- The migration and rollback examples used older NetworkManager slave terminology and did not ensure that bond/team port profiles are activated when the controller profile is brought up. Updated the examples to use `port-type`, `controller`, and `connection.autoconnect-ports 1`.
- The LACP example described `xmit_hash_policy=layer3+4` as generally better. Red Hat documents that this policy is not 802.3ad compliant for all traffic, so the text now presents it as an optional choice with a compatibility caveat.

## Review Notes
The post remains a manual migration template. Red Hat also documents the `team2bond` utility as the supported way to generate equivalent bond `nmcli` commands from an existing team configuration; future revisions could mention it more prominently.
