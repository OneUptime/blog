# Validation Summary: How to Use Ansible for Server Fleet Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible dynamic inventory
- amazon.aws.aws_ec2 inventory plugin
- Ansible ad-hoc commands
- Debian/Ubuntu apt package management
- Rolling server patching and health checks

## Sources Consulted
- Ansible amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible inventory patterns documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible ansible-inventory CLI documentation: https://docs.ansible.com/ansible/8/cli/ansible-inventory.html
- Ansible playbook strategies, forks, serial, and max_fail_percentage documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.reboot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible ansible.builtin.wait_for_connection module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html

## Issues Found
- The health-check playbook used `ansible.builtin.command: apt list --upgradable 2>/dev/null`. The Ansible command module does not process shell metacharacters such as `>`, so the stderr redirection would not work as written. Changed this task to `ansible.builtin.shell`.
- The same task was labeled as checking pending security updates, but `apt list --upgradable` lists all pending package upgrades, not only security updates. Changed the task label to "pending package updates" to match the command.

## Review Notes
The dynamic inventory, playbook keywords, rolling update controls, Ansible module names, and ad-hoc command patterns are consistent with current Ansible documentation. The examples assume Debian/Ubuntu hosts for the apt-related tasks and require the relevant Ansible collections, including `amazon.aws` and `community.general`, to be installed.
