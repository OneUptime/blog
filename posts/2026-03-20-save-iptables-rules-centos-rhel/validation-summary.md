# Validation Summary: How to Save iptables Rules Permanently on CentOS and RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- iptables and ip6tables
- iptables-save and iptables-restore
- iptables-services and iptables-nft-services
- systemd services on RHEL/CentOS
- firewalld and firewall-cmd
- SELinux audit troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 7 Security Guide, "Setting and Controlling IP sets using iptables": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/security_guide/security_guide
- Red Hat Enterprise Linux 8 Securing networks, "When to use firewalld, nftables, or iptables": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/htmlsingle/securing_networks/assembly_using-secure-communications-with-opensshsecuring-networks
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Red Hat Customer Portal, "Where is the iptables service in RHEL7, 8, 9?": https://access.redhat.com/solutions/1411953
- firewalld documentation, "Open a Port or Service": https://firewalld.org/documentation/howto/open-a-port-or-service
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- iptables-save(8) Linux manual page: https://man7.org/linux/man-pages/man8/iptables-save.8.html
- iptables-restore(8) Linux manual page: https://man7.org/linux/man-pages/man8/iptables-restore.8.html

## Issues Found
- The post said RHEL 9 used `iptables-services`. Red Hat documents RHEL 9 as using `iptables-nft-services` for the iptables service compatibility package, and RHEL 9 documentation recommends firewalld or nftables for new firewall configurations. Updated the description, intro, and install commands.
- The post saved IPv6 rules but did not enable or save through the `ip6tables` service. Added `ip6tables` enable/start commands and `service ip6tables save`.
- The `sudo /sbin/iptables-save > /etc/sysconfig/iptables` and `sudo /sbin/ip6tables-save > /etc/sysconfig/ip6tables` examples would run the shell redirection as the unprivileged user. Replaced them with `sudo sh -c '...'` forms.
- The manual restore command had the same redirection issue. Updated it to run the redirection inside the root shell.
- Verification commands used `cat` and `grep` without elevated permissions, which can fail on root-owned firewall files. Updated them to use `sudo`.
- The firewalld temporary-rule comment said runtime rules are lost on restart. firewalld runtime changes are also lost on reload, so the comment now says reload or restart.
- The SELinux section implied ordinary iptables rule changes may need SELinux context changes. Clarified that rule changes usually do not require SELinux changes, and added `restorecon` examples for copied or manually created rules files.
- The closing guidance said to always use `service iptables save` rather than manual editing. Red Hat documentation allows copying or editing correctly formatted rules files, so this was softened to prefer the save command while preserving the requirement to keep `iptables-save` format.

## Review Notes
RHEL 8 and RHEL 9 treat iptables as a compatibility path over the nftables framework. The tutorial is valid for maintaining existing iptables workflows, but a future revision could point new deployments more strongly toward firewalld or native nftables.
