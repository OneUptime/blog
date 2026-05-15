# Validation Summary: How to Automate kdump Configuration Using the kdump System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- kdump
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: kdump using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/configuring_basic_system_settings/managing_services_with_systemd-services-restart
- Red Hat Enterprise Linux 10 documentation: Configuring automatic crash dumps by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/automating_system_administration_by_using_rhel_system_roles/configuring-automatic-crash-dumps-by-using-rhel-system-roles
- Red Hat Enterprise Linux System Roles catalog, https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles

## Issues Found
- The playbook applied the `rhel-system-roles.kdump` role without setting any kdump variables, even though the post describes configuring kdump. Added the documented `kdump_path: /var/crash` example so the playbook configures the crash dump path.
- The verification commands used placeholders, `systemctl status <service>` and `cat <config-file>`, which would not run as written. Replaced them with `systemctl status kdump.service` and `cat /etc/kdump.conf`.

## Review Notes
The post is technically valid after the fixes. Red Hat's current RHEL 10 documentation also shows the collection-style role name `redhat.rhel_system_roles.kdump`, while RHEL 8 documentation still shows `rhel-system-roles.kdump`; the existing role name is consistent with the RHEL 8 documentation and was left unchanged.
