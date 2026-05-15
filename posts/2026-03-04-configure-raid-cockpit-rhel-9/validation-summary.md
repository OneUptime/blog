# Validation Summary: How to Configure RAID in the RHEL Web Console (Cockpit)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- cockpit-storaged
- Linux software RAID / mdraid
- mdadm
- firewalld
- XFS filesystems
- systemd socket activation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing RAID, including "Creating RAID in the web console", "Formatting RAID in the web console", and partitioning RAID devices. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console, including installation, enabling `cockpit.socket`, port 9090, login, and administrative access. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Enterprise Linux 9 documentation: Installing web console add-ons, including `cockpit-storaged` for storage management through `udisks`. https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/cockpit-add-ons-_system-management-using-the-rhel-9-web-console/
- Cockpit project documentation: storaged feature notes. https://cockpit-project.org/guide/latest/feature-storaged.html
- firewalld documentation: `firewall-cmd` and rich language service/source syntax. https://firewalld.org/documentation/man-pages/firewall-cmd and https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- Linux mdadm manual page for `--detail`, `--scan`, and `/proc/mdstat` behavior. https://man7.org/linux/man-pages/man8/mdadm.8.html

## Issues Found
- The post stated that Cockpit is installed by default on RHEL. Red Hat documents that RHEL 9 includes the web console by default in many installation variants, but not all. I changed the setup step to install `cockpit` first when it is missing.
- The prerequisites did not explicitly include `cockpit-storaged`, even though Red Hat lists it as required for RAID management in the web console. I added it to the prerequisite list.
- The post said Cockpit uses the same mdadm tools under the hood. Red Hat documents Cockpit storage as managed through `cockpit-storaged`/udisks and documents mdraid as controllable through `mdadm`. I adjusted the wording to say Cockpit creates standard mdraid devices that can be managed with mdadm from the CLI.
- The RAID creation UI steps referred to a "Create RAID device" button and plus icon. Red Hat's RHEL 9 documentation says to use the Storage table menu and select "Create MDRAID device". I updated the steps to match the documented RHEL 9 UI.
- The filesystem creation steps described a simple "Mount at boot" checkbox and a generic "Create" button. Red Hat documents the flow with Format/Create partition actions, an "At boot" option, and "Format and mount" or "Create and mount" buttons. I updated those steps.
- The login instruction said to log in with a sudo-capable user. Red Hat documents logging in with a system user account and switching to administrative access in the web console. I changed the wording accordingly.

## Review Notes
The remaining commands and examples are technically valid for RHEL 9-era systems: `systemctl enable --now cockpit.socket`, `dnf install -y cockpit-storaged`, `firewall-cmd --permanent --add-service=cockpit`, the rich rule syntax, `cat /proc/mdstat`, and `mdadm --detail` / `mdadm --detail --scan` are consistent with the consulted documentation. Some UI labels can vary slightly across Cockpit releases, but the revised wording now follows Red Hat's RHEL 9 documentation.
