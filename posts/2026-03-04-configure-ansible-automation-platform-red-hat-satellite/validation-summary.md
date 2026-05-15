# Validation Summary: How to Configure Ansible Automation Platform with Red Hat Satellite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- Ansible inventory files
- Ansible playbooks
- Ansible built-in modules: `dnf`, `systemd_service`, `ping`, and `command`
- Red Hat Satellite / Ansible Automation Platform claims reviewed for accuracy

## Sources Consulted
- Ansible Core installation documentation: https://docs.ansible.com/projects/ansible-core/devel/installation_guide/intro_installation.html
- Ansible distribution installation documentation: https://docs.ansible.com/projects/ansible/latest/installation_guide/installation_distros.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/getting_started/get_started_inventory.html
- `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Red Hat Satellite 6.18 Ansible Automation Platform integration documentation: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/managing_configurations_by_using_ansible_integration/integrating_satellite_and_ansible_automation_platform_ansible
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index

## Issues Found
- The original title, tags, description, overview, and summary claimed the post configured Ansible Automation Platform with Red Hat Satellite. The body only showed local Ansible Core CLI usage and did not configure Satellite, Ansible Automation Platform, a Satellite dynamic inventory source, or provisioning callbacks. Updated these claims so the post accurately describes configuring Ansible Core on RHEL.
- The inventory section said to create `/etc/ansible/hosts` or a local file, but every command used `-i inventory.ini`. Updated the instruction to create `inventory.ini` so the commands match the described setup.
- The playbook used `ansible.builtin.systemd`, which is retained as a backward-compatible alias. Updated it to the current documented FQCN, `ansible.builtin.systemd_service`.
- The playbook installed and verified `htop`, which is not a safe example for a plain RHEL 9 system without extra repositories such as EPEL. Replaced it with `chrony` and updated the service and verification command to use `chronyd` / `rpm -q chrony`.
- The package example used `vim`; updated it to the RHEL package name `vim-enhanced`.

## Review Notes
The corrected post is technically valid as a basic Ansible Core tutorial for RHEL hosts. It no longer covers Red Hat Satellite or Ansible Automation Platform integration; a future post with that scope should follow the Satellite workflow for configuring Satellite as an Ansible Automation Platform dynamic inventory source and, optionally, provisioning callbacks.
