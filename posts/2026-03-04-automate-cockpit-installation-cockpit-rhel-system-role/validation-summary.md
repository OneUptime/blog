# Validation Summary: How to Automate Cockpit Installation Using the cockpit RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible Core
- Cockpit / RHEL web console
- systemd

## Sources Consulted
- Red Hat documentation: Managing systems using the RHEL 9 web console, Installing and configuring web console by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat documentation: Automating system administration by using RHEL system roles, Installing the web console by using the cockpit RHEL system role: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automating_system_administration_by_using_rhel_system_roles/automating_system_administration_by_using_rhel_system_roles
- Red Hat Customer Portal: Red Hat Enterprise Linux (RHEL) System Roles overview and installation paths: https://access.redhat.com/articles/3050101

## Issues Found
- The System Roles installation command installed only `rhel-system-roles`. Red Hat's current RHEL 9/10 guidance installs both `rhel-system-roles` and `ansible-core`, so the command was updated to include `ansible-core`.
- The playbook used the legacy RPM role name `rhel-system-roles.cockpit`. Red Hat's current cockpit System Role examples use the collection role name `redhat.rhel_system_roles.cockpit`, so the role reference was updated.
- The post pointed readers to `/usr/share/doc/rhel-system-roles/cockpit/README.md`, which is not the documented role README path. Red Hat's cockpit System Role documentation points to `/usr/share/ansible/roles/rhel-system-roles.cockpit/README.md`, so the commands were corrected.
- The verification step used placeholders (`<service>` and `<config-file>`) instead of Cockpit-specific checks. It was updated to check `cockpit.socket` and connect to the default web console endpoint on port 9090.

## Review Notes
The post remains a concise tutorial. Future improvements could show optional variables such as `cockpit_manage_firewall`, `cockpit_manage_selinux`, `cockpit_packages`, and `cockpit_certificates`, but the current minimal playbook is valid for installing and enabling the RHEL web console.
