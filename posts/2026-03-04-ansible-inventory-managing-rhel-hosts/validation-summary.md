# Validation Summary: How to Create an Ansible Inventory for Managing RHEL Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- Ansible inventory files
- Ansible ad hoc commands
- Ansible playbooks
- DNF package management
- systemd service management

## Sources Consulted
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible installation and managed node requirements: https://docs.ansible.com/projects/ansible-core/devel/installation_guide/intro_installation.html
- Ansible ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible check mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Red Hat DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat EPEL support note: https://access.redhat.com/solutions/3358

## Issues Found
- The inventory instructions said to create `/etc/ansible/hosts` or a local file, but the commands specifically used `-i inventory.ini`. Updated the text to name `inventory.ini` and explain that `-i inventory.ini` should be omitted when using the default inventory path.
- The package example installed and verified `htop`, which is not part of standard RHEL repositories and normally requires EPEL. Replaced it with `curl`, a safer package example for a RHEL-focused tutorial.
- The playbook used `ansible.builtin.systemd`, which is a compatibility alias redirected to `ansible.builtin.systemd_service`. Updated it to the current module name recommended by Ansible documentation.

## Review Notes
The Ansible `ping` command is correctly used as an Ansible connectivity and Python test, not as ICMP ping. The `--check` usage is correct, but check mode remains a simulation and module support can vary.
