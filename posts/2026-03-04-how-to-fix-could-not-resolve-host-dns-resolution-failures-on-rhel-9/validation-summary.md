# Validation Summary: How to Fix 'Could Not Resolve Host' DNS Resolution Failures on RHEL 9

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNS resolution
- NetworkManager and nmcli
- systemd-resolved and resolvectl
- /etc/resolv.conf
- /etc/nsswitch.conf
- /etc/hosts
- firewalld and nftables
- dig, nslookup, host, and ping

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- systemd-resolved.service manual for RHEL 9: https://redhat-plumbers.github.io/systemd-rhel9/systemd-resolved.html
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- Red Hat Developer explanation of /etc/nsswitch.conf host lookup order: https://developers.redhat.com/blog/2018/11/26/etc-nsswitch-conf-non-complexity
- Red Hat Enterprise Linux 9 Installing Identity Management documentation for valid /etc/hosts localhost entries: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/installing_identity_management/Red_Hat_Enterprise_Linux-9-Installing_Identity_Management-en-US.pdf
- Local command documentation checked with nmcli --help, resolvectl --help, nft --help, and installed man pages for nm-settings-nmcli, resolvectl, and nsswitch.conf.

## Issues Found
- The NetworkManager examples used the hard-coded connection profile name "System eth0". RHEL 9 connection profile names vary by installation, device naming, and provisioning method, so those commands can fail on many valid systems. I changed the example to list active connections first and use "<connection-name>" in the subsequent nmcli commands.
- The systemd-resolved restart instruction implied that restarting systemd-resolved is always applicable. RHEL 9 can use NetworkManager-managed /etc/resolv.conf directly or integrate with systemd-resolved, so I clarified that the restart applies when the host uses systemd-resolved.

## Review Notes
The diagnostic commands and configuration snippets are technically valid for RHEL 9. The dig, nslookup, and host commands may require the bind-utils package on minimal systems. The firewall section is a reasonable high-level check, but future revisions could distinguish firewalld's default inbound-zone view from explicit outbound policies or nftables rules.
