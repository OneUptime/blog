# Validation Summary: How to Deploy Cockpit-389ds for Directory Server Management on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Directory Server 12 / 389 Directory Server
- Cockpit web console
- cockpit-389-ds
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- Red Hat Directory Server 12 documentation: Installing Red Hat Directory Server: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html-single/installing_red_hat_directory_server/index
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Enterprise Linux 9 documentation: Installing web console add-ons and creating custom pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/cockpit-add-ons-_system-management-using-the-rhel-9-web-console
- 389 Directory Server project documentation: Download / installation notes: https://www.port389.org/docs/389ds/download.html

## Issues Found
- The original post used placeholders such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>`, which were not valid Cockpit or Directory Server commands. Replaced them with verified package names, systemd units, utilities, and ports.
- The original post omitted the actual installation step for Cockpit and Directory Server. Added the documented `redhat-ds:12` module enablement and package installation commands for RHEL 9.
- The original post described editing a generic service configuration file. Replaced this with the supported `dscreate interactive` workflow for creating a Directory Server instance.
- The original post used a generic service lifecycle workflow. Replaced it with `cockpit.socket`, `dsctl instance_name`, and `dirsrv@instance_name`, matching Red Hat Directory Server service-management documentation.
- The firewall command used an unspecified port. Replaced it with the documented Cockpit service rule and the default LDAP/LDAPS ports, `389/tcp` and `636/tcp`.

## Review Notes
The guide now targets RHEL 9 with Red Hat Directory Server repositories enabled. CentOS Stream 9 was removed from the prerequisites because the RHEL-specific `redhat-ds:12` module and Red Hat Directory Server documentation do not apply directly to CentOS Stream installations.
