# Validation Summary: How to Disable IPv6 on Specific Interfaces Using NetworkManager on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- IPv6
- Linux sysctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using NetworkManager to disable IPv6 for a specific connection, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/using-networkmanager-to-disable-ipv6-for-a-specific-connection_configuring-and-managing-networking
- NetworkManager nm-settings-nmcli reference, https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local NetworkManager manual page: `man nm-settings-nmcli` from NetworkManager 1.46.0
- Red Hat Customer Portal article: Why does NetworkManager report IPv6 related warnings when IPv6 is disabled in the kernel?, https://access.redhat.com/solutions/6967304
- Red Hat Customer Portal article: SELinux AVC messages occur when IPv6 is disabled as a kernel parameter, https://access.redhat.com/solutions/3559431

## Issues Found
- The original "Ignoring IPv6 Autoconfiguration" section used `ipv6.method ignore` as if it ignored Router Advertisements and DHCPv6 while keeping NetworkManager-managed IPv6 active. NetworkManager documents `ignore` as making no IPv6 changes on the interface, so this was technically misleading. Updated the section to use `ipv6.method auto ipv6.ignore-auto-dns yes ipv6.ignore-auto-routes yes`, which matches the documented behavior for ignoring automatically learned DNS and routes.
- The Mermaid diagram described `auto` as "SLAAC + DHCPv6" and `manual` as "Static addresses only." Updated these labels to reflect NetworkManager behavior more precisely: `auto` uses Router Advertisements and DHCPv6 when requested by the router, and `manual` still gets a link-local address in addition to configured static addresses.
- The static re-enable example set `ipv6.method manual` and `ipv6.addresses` in separate commands. Because NetworkManager documents that `manual` requires at least one IPv6 address and prefix, combined them into one `nmcli connection modify` command.

## Review Notes
The primary RHEL 9 workflow using `nmcli connection modify <connection> ipv6.method disabled`, reactivating the connection, and checking `/proc/sys/net/ipv6/conf/<interface>/disable_ipv6` matches Red Hat's RHEL 9 documentation. The warnings about kernel-level IPv6 disabling are consistent with Red Hat guidance and related Knowledgebase articles.
