# Validation Summary: How to Establish a Change Management Process for RHEL Infrastructure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF package management
- etckeeper
- Git
- systemd
- SELinux audit logs
- firewalld
- nftables
- iptables
- LVM snapshots
- auditd

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 8 documentation, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 8 documentation, "Configuring and managing logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/system_design_guide/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Red Hat Customer Portal, "How to use Extra Packages for Enterprise Linux (EPEL)?": https://access.redhat.com/solutions/3358
- Fedora package metadata for etckeeper: https://packages.fedoraproject.org/pkgs/etckeeper/etckeeper/epel-8.html
- etckeeper upstream README: https://sources.debian.org/src/etckeeper/1.18.22-2/doc/README.mdwn

## Issues Found
- The description said the process used built-in tools, but etckeeper is commonly provided through EPEL rather than standard supported RHEL channels. Changed "built-in tools" to "common tools."
- The etckeeper install command implied `sudo dnf install etckeeper git` works on a default RHEL system. Added a note to enable EPEL or an approved internal repository first if etckeeper is not already available.
- The post stated etckeeper hooks into DNF automatically without qualification. Updated the text to say this applies when etckeeper is installed with DNF integration.
- The firewall snapshot used only `iptables-save`, which can miss the active ruleset on RHEL 8+ systems using firewalld with nftables. Added `firewall-cmd --list-all-zones` and `nft list ruleset` captures while keeping `iptables-save` for iptables-based systems.
- The post described `ausearch --start recent` as checking SELinux denials since the change. That option checks a recent time window, not the exact change start time. Changed the wording to "recent SELinux denials."
- The DNF rollback examples did not mention Red Hat's caveat that `dnf history undo` is not supported for downgrading core RHEL system packages. Added a note before the rollback command.

## Review Notes
The commands and snippets are otherwise technically valid for a RHEL change-management workflow. Future improvements could add explicit handling for missing `CHANGE_ID` in the post-change script and more detailed repository policy guidance for organizations that do not permit EPEL.
