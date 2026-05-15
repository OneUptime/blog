# Validation Summary: How to Automate NBDE Deployment with RHEL System Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL System Roles
- Ansible and Ansible Core
- Network-Bound Disk Encryption (NBDE)
- Tang
- Clevis
- LUKS
- firewalld and SELinux integration through RHEL System Roles

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring NBDE by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-nbde-by-using-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation, "Automating system administration by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Red Hat Enterprise Linux System Roles collection page: https://catalog.redhat.com/software/collection/redhat/rhel_system_roles
- Red Hat Customer Portal, "Red Hat Enterprise Linux (RHEL) System Roles": https://access.redhat.com/articles/3050101
- Tang upstream documentation and README: https://github.com/latchset/tang
- tangd-rotate-keys manual page: https://www.mankier.com/1/tangd-rotate-keys

## Issues Found
- The installation example omitted `ansible-core`. Red Hat's RHEL 9 guidance installs `rhel-system-roles` together with `ansible-core`, so the install command was updated.
- The role examples used legacy role names such as `rhel-system-roles.nbde_server`. Current Red Hat examples and the RHEL System Roles collection use `redhat.rhel_system_roles.nbde_server` and `redhat.rhel_system_roles.nbde_client`, so the role names and verification path were updated.
- The combined client play was labeled "with SSS" but the configuration creates independent Tang bindings, not an SSS threshold policy. The play name was changed to "Configure Clevis clients".
- The Tang key rotation example generated keys manually and restarted `tangd.socket`, but current NBDE server role documentation provides `nbde_server_rotate_keys`, and Tang key changes do not require a service restart. The example was updated to use the role variable and to explain that old keys must remain until clients have been updated.

## Review Notes
The local review environment did not have Ansible, DNF, Tang, or Clevis installed, so command behavior was checked against official Red Hat and Tang documentation rather than local `--help` output. The post assumes DHCP or otherwise working early-boot networking for NBDE clients; Red Hat documents additional bootloader configuration for static-IP early-boot clients.
