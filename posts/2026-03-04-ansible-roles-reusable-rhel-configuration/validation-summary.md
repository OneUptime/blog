# Validation Summary: How to Use Ansible Roles for Reusable RHEL Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- Ansible roles
- Ansible inventory
- Ansible playbooks
- DNF package management
- systemd service management

## Sources Consulted
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible inventory getting started guide: https://docs.ansible.com/projects/ansible/latest/getting_started/get_started_inventory.html
- Ansible ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Red Hat RHEL 9 DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat documentation showing ansible-core installation on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/installing_rhel_9_for_sap_solutions/installing_rhel_9_for_sap_solutions

## Issues Found
- The post title and description claimed to show reusable Ansible roles, but the original example used only inline playbook tasks. Updated Step 3 to put the package and service tasks in `roles/common/tasks/main.yml` and call the role from the playbook with `roles:`.
- Replaced `ansible.builtin.systemd` with `ansible.builtin.systemd_service`, the current documented FQCN for managing systemd units.
- Replaced the `htop` package example and verification command with `tmux`, keeping the example focused on common RHEL repository package installation without requiring an extra repository.

## Review Notes
The inventory format, `ansible all -i inventory.ini -m ping`, `ansible-playbook -i inventory.ini playbook.yml`, `--check`, and `ansible.builtin.dnf` usage are consistent with official Ansible and Red Hat documentation. Ansible was not installed in the local review environment, so commands were verified against official documentation rather than executed locally.
