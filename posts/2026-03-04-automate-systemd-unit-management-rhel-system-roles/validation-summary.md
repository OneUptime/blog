# Validation Summary: How to Automate systemd Unit Management Using RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux System Roles
- Ansible playbooks
- Ansible `include_role`
- Ansible `systemd_service`
- systemd service units
- RHEL `dnf`
- chrony / timesync

## Sources Consulted
- Red Hat RHEL 8 documentation, "Automating system administration by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Red Hat Enterprise Linux System Roles collection catalog: https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible collection requirements documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections_guide/collections_installing.html
- Local systemd manual pages: `systemd.service(5)` and `systemd.exec(5)`

## Issues Found
- The post used the incorrect role names `rhel-system-roles.systemd` and `rhel-system-roles.timesync`. Updated them to the documented collection FQCNs `redhat.rhel_system_roles.systemd` and `redhat.rhel_system_roles.timesync`.
- The installation verification path described only the older role directory. Updated it to the documented collection path under `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`.
- Several examples claimed to use the RHEL systemd role but actually used direct `ansible.builtin.systemd_service` tasks. Updated the examples to use `ansible.builtin.include_role` with documented RHEL systemd role variables such as `systemd_started_units`, `systemd_enabled_units`, `systemd_stopped_units`, `systemd_disabled_units`, and `systemd_unit_file_templates`.
- The custom unit deployment example used a handler and direct template copy instead of the RHEL systemd role's documented unit template workflow. Updated it to use `systemd_unit_file_templates` and clarified the required `<name>.<unit_type>.j2` naming convention.
- The bulk service section referred to loops, but the corrected RHEL role example uses unit lists. Updated the heading and explanation accordingly.
- The verification task would fail before printing statuses if any service was inactive. Added `failed_when: false` so the debug task can report collected results.
- The `requirements.yml` example incorrectly placed `redhat.rhel_system_roles` under `roles`. Updated it to use the `collections` key, which is the documented format for collection requirements.

## Review Notes
The corrected post now focuses on the RHEL systemd role rather than mixing role-based automation with direct module examples. Standalone use of `ansible.builtin.systemd_service` remains mentioned as a valid option for non-role playbooks.
