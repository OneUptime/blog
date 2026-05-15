# Validation Summary: How to Write Your First Ansible Playbook for RHEL System Administration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- Ansible inventory
- Ansible playbooks
- Ansible built-in modules: dnf, systemd_service, ping, command
- DNF and RPM package management
- OpenSSH sshd service management

## Sources Consulted
- Ansible Core installation guide: https://docs.ansible.com/projects/ansible-core/devel/installation_guide/intro_installation.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible.builtin.ping module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ping_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Red Hat Enterprise Linux 9 Python documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Red Hat Customer Portal article on ansible-core in RHEL 9 AppStream: https://access.redhat.com/articles/6325611

## Issues Found
- The package list used `htop`, but Red Hat's RHEL 9 package manifest does not list `htop` in the standard RHEL repositories. Changed the example package to `rsync`, which is listed in the RHEL 9 package manifest, and updated the verification command accordingly.
- The package list used `vim`, which is ambiguous as a RHEL package name. Changed it to `vim-minimal`, which is listed in the RHEL 9 package manifest.
- The playbook used `ansible.builtin.systemd`. Ansible documentation states that this module was renamed to `ansible.builtin.systemd_service`, with `systemd` kept as a backward-compatible alias. Updated the playbook to use the current FQCN.

## Review Notes
The Ansible inventory examples, `ansible --version`, `ansible all -i inventory.ini -m ping`, `ansible-playbook -i inventory.ini playbook.yml`, `--check`, and the ad hoc `command` module usage are consistent with Ansible documentation. The RHEL 9 Python prerequisite is accurate because Python 3.9 is the default Python implementation and is usually installed by default.
