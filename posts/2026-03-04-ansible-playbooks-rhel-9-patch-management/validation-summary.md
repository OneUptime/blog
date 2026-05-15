# Validation Summary: How to Write Ansible Playbooks for RHEL Patch Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- Ansible inventory files
- Ansible playbooks
- ansible.builtin.dnf
- DNF security updates
- SSH
- Python 3

## Sources Consulted
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ini_inventory.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible.builtin.ping` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Red Hat RHEL 9 system roles introduction: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/intro-to-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat RHEL 9 Python documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat RHEL 9 security update documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/installing-security-updates_managing-and-monitoring-security-updates
- Red Hat RHEL 9 security update identification documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/identifying-security-updates_managing-and-monitoring-security-updates

## Issues Found
- The original sample playbook installed general-purpose packages and started `sshd`, which did not match the post's stated topic of RHEL patch management and security updates. Updated the playbook to apply available security updates with `ansible.builtin.dnf`, `name: "*"`, `state: latest`, `security: true`, `update_only: true`, and `update_cache: true`.
- The original verification command checked whether `htop` was installed, which was unrelated to patch management. Updated it to run `dnf updateinfo list updates security`, matching Red Hat's documented command for listing available security updates.
- The prerequisites did not mention that managed RHEL hosts need an attached Red Hat subscription for security update metadata and packages. Added that prerequisite.
- The inventory instructions mentioned either `/etc/ansible/hosts` or a local inventory, while the following commands used `inventory.ini`. Clarified that the local inventory file should be named `inventory.ini`.

## Review Notes
Ansible is not installed in this workspace, so `ansible-playbook --syntax-check` could not be run locally. The updated YAML and commands were reviewed against official Ansible and Red Hat documentation.
