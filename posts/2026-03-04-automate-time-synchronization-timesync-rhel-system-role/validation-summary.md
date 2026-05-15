# Validation Summary: How to Automate Time Synchronization Using the timesync RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- timesync role
- chrony
- NTP

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Configuring time synchronization by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Red Hat Enterprise Linux 8 documentation, "Configuring time synchronization": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/configuring-time-synchronization_configuring-basic-system-settings
- Red Hat Customer Portal, "Red Hat Enterprise Linux (RHEL) System Roles": https://access.redhat.com/articles/3050101

## Issues Found
- The playbook did not define `timesync_ntp_servers`, so it did not show a complete NTP client configuration. Added a documented pool entry using `hostname`, `pool: yes`, and `iburst: yes`.
- The verification commands used placeholders (`<service>` and `<config-file>`) instead of concrete commands. Replaced them with `systemctl status chronyd`, `chronyc sources`, and `cat /etc/chrony.conf`, which match the documented default chrony provider on RHEL 8 and later.

## Review Notes
The legacy role name `rhel-system-roles.timesync` is documented by Red Hat and is valid for the package-installed role path described in the post. Newer Red Hat examples may use the collection-qualified role name `redhat.rhel_system_roles.timesync` with `include_role`.
