# Validation Summary: How to Use Ansible become with SSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- SSH
- sudo / privilege escalation
- Linux service and package management
- Ansible inventory, playbooks, and ansible.cfg

## Sources Consulted
- Ansible Community Documentation: Understanding privilege escalation: become - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible Community Documentation: ansible.builtin.sudo become plugin - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible Community Documentation: ansible.builtin.ssh connection plugin - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible Community Documentation: Configuration Settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: How to build your inventory - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: ansible CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible.html

## Issues Found
- The pipelining explanation said Ansible executes multiple commands in a single SSH session. Updated it to match Ansible's documented behavior: pipelining reduces connection operations by running modules without an extra file transfer step.
- The debugging section suggested adding `-o RequireTty`, which is not a valid SSH fix for sudo `requiretty`. Updated it to say to disable `requiretty` in sudoers or set `pipelining = false`.
- The security section recommended limiting sudo access to only the commands Ansible needs. Ansible documentation states privilege escalation must be general because modules run from temporary files with changing paths. Updated the advice to recommend a dedicated automation account and sudo access broad enough for Ansible modules.
- The wrap-up said to always connect as a regular user. Adjusted this to "prefer" connecting as a regular user, preserving the security guidance without making an absolute operational claim.

## Review Notes
- The playbook and inventory examples use current Ansible keywords and connection variables.
- The `ansible_become_pass` variable shown in the sudo password example is accepted by the sudo become plugin, though `ansible_become_password` is also documented.
- The local environment did not have `ansible` or `ansible-playbook` installed, so CLI help could not be checked locally. Commands and options were verified against official Ansible documentation instead.
