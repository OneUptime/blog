# Validation Summary: Ansible’s First Production Run: Inventory, ansible.cfg, SSH, and Playbook Setup

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Ansible and `ansible-core`
- YAML inventories, host variables, and group variables
- Ansible configuration (`ansible.cfg`)
- OpenSSH keys, agents, host-key verification, and jump hosts
- Ansible ad hoc commands and privilege escalation
- Ansible playbooks, facts, check mode, serial execution, and idempotence
- Ansible Vault and secret-handling practices

## Sources Consulted

- [Installing Ansible](https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html)
- [How to build your inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [Interpreter Discovery](https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/interpreter_discovery.html)
- [Ansible Configuration Settings](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html)
- [ansible.builtin.ssh connection plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html)
- [ansible CLI reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible.html)
- [ansible-inventory CLI reference](https://docs.ansible.com/projects/ansible-core/2.20/cli/ansible-inventory.html)
- [ansible-playbook CLI reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html)
- [Ansible 12 Porting Guide](https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_12.html)
- [ansible.builtin.ping module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html)
- [ansible.builtin.raw module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html)
- [ansible.builtin.command module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)
- [ansible.builtin.copy module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html)
- [Error handling in playbooks](https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_error_handling.html)
- [Validating tasks: check mode and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [OpenSSH ssh-keygen(1)](https://man.openbsd.org/ssh-keygen)
- [OpenSSH ssh-add(1)](https://man.openbsd.org/ssh-add)
- [OpenSSH ssh_config(5)](https://man.openbsd.org/ssh_config)
- [OpenSSH ssh-keyscan(1)](https://man.openbsd.org/ssh-keyscan)
- [FreeBSD Handbook: FreeBSD Basics](https://docs.freebsd.org/en/books/handbook/basics/)

## Issues Found

- The environment-directory statement said the layout “prevents” cross-environment selection, but Ansible can still be directed to other or multiple inventory sources. Changed it to “helps prevent” so it does not claim an enforcement boundary.
- The SSH setup ran `ssh-add` without stating that an SSH agent must already be available. Added that prerequisite because `ssh-add` otherwise fails when no agent is running.
- Both ad hoc examples used `--one-line`. The oneline callback and its `-o`/`--one-line` CLI options are deprecated and scheduled for removal from `ansible-core`; removed the option from both commands.
- The privilege-escalation check described `id -u` as read-only but did not explain that `ansible.builtin.command` still normally reports `CHANGED` for arbitrary commands. Added that distinction so the observed result is not mistaken for a system change.
- The playbook accepted FreeBSD while assigning both filesystem objects to group `root`. Standard FreeBSD uses `wheel` as root’s group, so the tasks could fail after the assertion passed. Restricted this intentionally small example to Linux, matching its ownership settings and interpreter example.
- The `any_errors_fatal` explanation did not accurately distinguish serial-batch completion from the play-wide stop. Clarified that Ansible finishes the fatal task on the current batch and then stops the play on all hosts.

## Review Notes

- The inventory, configuration, and playbook snippets were parsed and syntax-checked with `ansible-core` 2.21.2.
- The hard-coded `/usr/bin/python3` remains valid only under the post’s stated assumption that the path is known across all selected hosts; interpreter discovery is the correct alternative for a heterogeneous fleet.
- The warnings about check-mode limitations, SSH host-key verification, secrets, canary rollout, and second-run idempotence are technically sound.
