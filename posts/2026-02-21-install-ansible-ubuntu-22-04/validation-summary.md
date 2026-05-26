# Validation Summary: How to Install Ansible on Ubuntu 22.04 Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ansible
- Ubuntu 22.04 LTS
- apt and Ubuntu package repositories
- Ansible PPA on Launchpad
- Python virtual environments and pip
- SSH key authentication
- Ansible inventory files and playbooks

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible Ubuntu/PPA installation documentation: https://docs.ansible.com/projects/ansible/6/installation_guide/installation_distros.html
- Ansible PPA on Launchpad: https://launchpad.net/~ansible/+archive/ubuntu/ansible
- Ubuntu package page for `ansible` on Jammy: https://packages.ubuntu.com/jammy/ansible
- Ubuntu package page for `ansible-core` on Jammy: https://packages.ubuntu.com/jammy/ansible-core
- Ubuntu 22.04 LTS release notes: https://documentation.ubuntu.com/release-notes/22.04/
- Ansible `ansible.builtin.ping` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/ping_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.debug` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html

## Issues Found
- The post said the default Ubuntu 22.04 repository installs Ansible core 2.12.x when using `sudo apt install ansible`. Ubuntu's Jammy `ansible` package is version 2.10.7+merged+base+2.10.8, while `ansible-core` 2.12.0 is a separate Jammy package. Updated the statement to match the package actually installed by the command shown.
- The post said the Ansible PPA typically provides Ansible 2.16.x or later as of early 2026. Launchpad shows the Jammy PPA publishing the Ansible community package 10.x and ansible-core 2.17.x. Updated the wording to distinguish the Ansible community package version from the ansible-core version and avoid implying Jammy receives the newest Ansible release series.

## Review Notes
The installation commands, SSH examples, inventory variables, ad-hoc ping command, and sample playbook are technically valid. The pip installation approach is valid inside a virtual environment; for non-virtual-environment installs, current Ansible documentation also recommends `pipx` or `python3 -m pip install --user ansible` depending on the environment.
