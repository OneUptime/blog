# Validation Summary: How to Install and Configure the Cockpit Web Console Using RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Cockpit web console
- Ansible and Ansible playbooks
- firewalld
- TuneD

## Sources Consulted
- Red Hat documentation: Installing and configuring web console with the cockpit RHEL System Role - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/automating_system_administration_by_using_rhel_system_roles_in_rhel_7.9/assembly_installing-and-configuring-web-console-with-the-cockpit-rhel-system-role_automating-system-administration-by-using-rhel-system-roles
- Linux System Roles cockpit role documentation - https://linux-system-roles.github.io/cockpit/
- Red Hat catalog: Red Hat Enterprise Linux System Roles collection - https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles
- Cockpit configuration file manual page - https://cockpit-project.org/guide/latest/cockpit.conf.5
- Red Hat documentation: Configuring firewalld using RHEL system roles - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/assembly_configuring-firewalld-using-system-roles_automating-system-administration-by-using-rhel-system-roles

## Issues Found
- The basic deployment example claimed the role opened the firewall port with default settings. The Cockpit role defaults `cockpit_manage_firewall` to `false`, so I added `cockpit_manage_firewall: true` to that playbook and adjusted the surrounding wording.
- The custom certificate section implied that the shown playbook used certificate role integration. The example actually copies an existing certificate/key and uses `cockpit_cert` and `cockpit_private_key`, so I clarified the distinction between existing certificates and generated certificates via `cockpit_certificates`.
- The `cockpit.conf` section used manual post-tasks and included `IdleTimeout` under `[WebService]`, which is not a valid Cockpit `WebService` setting. I changed the example to use the Cockpit role's `cockpit_config` variable and kept `IdleTimeout` only under `Session`.
- The combined system roles example defined `tuned_profile` but did not include the TuneD role, so the variable would not have been applied. I added `rhel-system-roles.tuned` and adjusted the text to describe firewall, performance tuning, and Cockpit.
- The wrap-up overstated firewall handling as unconditional. I changed it to state that the Cockpit role handles firewall configuration when `cockpit_manage_firewall` is enabled.

## Review Notes
The examples use the RPM-installed role names such as `rhel-system-roles.cockpit`, which are documented for the `rhel-system-roles` package. Red Hat also documents the collection form `redhat.rhel_system_roles.<role_name>` when installing the collection from Automation Hub.
