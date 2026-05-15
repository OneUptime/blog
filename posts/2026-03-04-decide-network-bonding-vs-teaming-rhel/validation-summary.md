# Validation Summary: How to Decide Between Network Bonding and Teaming on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux network bonding
- Linux network teaming
- NetworkManager and nmcli
- teamd, libteam, and teamdctl
- LACP / IEEE 802.3ad

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Considerations in adopting RHEL 10, Chapter 18 Networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/considerations_in_adopting_rhel_10/networking
- Red Hat Enterprise Linux 10 documentation: Configuring a network bond: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_networking/configuring-a-network-bond
- Red Hat Enterprise Linux 9 documentation: 9.2 Release Notes, Deprecated functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.2_release_notes/deprecated-functionality
- Red Hat Enterprise Linux 8 documentation: Configuring a NIC team: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-network-teaming_configuring-and-managing-networking

## Issues Found
- The post described teaming as deprecated in an unspecified RHEL release and "likely" to be removed in RHEL 10. Red Hat's current RHEL 10 documentation states that the `teamd` service and `libteam` library were removed in RHEL 10, while RHEL 9 release notes state that network teams were deprecated in RHEL 9. Updated the introduction, deprecation diagram, bullet list, feature table, recommendation, and summary to reflect this accurately.

## Review Notes
The `nmcli connection add type bond ... bond.options` examples use valid NetworkManager syntax and valid bonding modes/options. The team runner and link watcher names are consistent with Red Hat's RHEL 8 networking documentation. The migration snippets are illustrative and do not include all steps required for a complete production migration, such as moving IP settings and adding bond ports.
