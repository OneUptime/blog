# Validation Summary: How to Use the RHEL Web Console (Cockpit) for Day-to-Day System Administration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Web Console / Cockpit
- systemd and systemctl
- firewalld and firewall-cmd
- NetworkManager and nmcli
- LVM and XFS resizing
- DNF package management and security updates
- SSH tunneling and remote host management

## Sources Consulted
- Red Hat Documentation: Managing systems using the RHEL 9 web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Documentation: Managing software updates in the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/managing-software-updates-in-the-web-console_system-management-using-the-rhel-9-web-console
- Red Hat Documentation: Configuring firewalls and packet filters in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Documentation: Managing users and groups in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-and-groups_configuring-basic-system-settings
- Red Hat Documentation: Managing storage devices and RAID in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- Red Hat Documentation: Configuring and managing logical volumes in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Documentation: Managing and monitoring security updates in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/installing-security-updates_managing-and-monitoring-security-updates
- Red Hat Documentation: Configuring and managing networking in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index

## Issues Found
- The login instructions implied that only sudo-capable users can log in. Red Hat documents that the default PAM setup allows local system account credentials, while administrative actions require administrative access. Updated the wording to distinguish login from administrative privileges.
- The Storage section did not mention that storage management requires the `cockpit-storaged` add-on when it is not already installed. Added the minimal install command for that add-on.
- The LVM resize example extended the logical volume and then ran `xfs_growfs` against the block device path. RHEL 9 documentation recommends `lvextend --resizefs` to extend the logical volume and file system together. Replaced the two-command example with `sudo lvextend --resizefs -L +10G /dev/vg_data/lv_app`.
- The multiple-server section said the remote host needed Cockpit installed and port 9090 open. Red Hat documents remote host switching over SSH with `cockpit-system` installed on the remote system, `sshd` running, and SSH allowed through the firewall. Updated the prerequisite accordingly.

## Review Notes
The remaining commands and claims are consistent with the referenced RHEL 9 documentation. Some web console pages depend on optional Cockpit add-on packages, so future posts could mention package prerequisites near each feature.
