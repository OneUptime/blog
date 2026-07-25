# Validation Summary: Secure Ansible Privilege Escalation with become, Sudo, and Dedicated Accounts

## Status
validated

## Post Type
Security guide and Ansible configuration tutorial

## Technologies Covered
- Ansible playbooks and inventory
- Ansible privilege escalation (`become`)
- The Ansible `sudo` become plugin
- Linux user and SSH key management
- sudo and sudoers policy
- Ansible Vault and automation-platform credentials
- Ansible pipelining and remote temporary files
- AWX and CI authorization and auditing

## Sources Consulted
- [Understanding privilege escalation: become](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html)
- [Become plugins](https://docs.ansible.com/projects/ansible/latest/plugins/become.html)
- [Connection methods and details](https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html)
- [Ansible configuration settings: ANSIBLE_PIPELINING](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#ansible-pipelining)
- [Blocks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html)
- [Setting the remote environment](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_environment.html)
- [Ansible Vault](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html)
- [Introduction to ad hoc commands](https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html)
- [`ansible.builtin.user` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html)
- [`ansible.posix.authorized_key` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html)
- [`ansible.builtin.command` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)
- [`ansible.builtin.copy` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html)
- [`ansible.builtin.package` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html)
- [`ansible.builtin.template` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html)
- [sudoers manual](https://www.sudo.ws/docs/man/sudoers.man/)
- [sudo manual](https://www.sudo.ws/docs/man/sudo.man/)
- [visudo manual](https://www.sudo.ws/docs/man/visudo.man/)

## Issues Found
- The account-provisioning example used `ansible.posix.authorized_key` without identifying its collection dependency. Added a note that `ansible.posix` is not included in `ansible-core`.
- The privileged-wrapper option could be read as compatible with normal Ansible `become`, but `become` asks sudo to run Ansible's generated module command rather than the wrapper path. Clarified that an allowlisted wrapper must be invoked explicitly through sudo from a task that does not use `become`.
- The smallest-scope discussion overstated the protection provided by task-level `become` when the account has `NOPASSWD: ALL`. Added the explicit caveat that any process running as that account can call sudo directly, so `become` is a review boundary rather than an enforcement boundary under the shown policy.
- The pipelining explanation was imprecise about module transfer behavior and described TTY requirements as limited to older sudo configurations. Updated it to match Ansible's documented behavior, including the exceptions for file-transfer and non-Python modules, and clarified that any sudo policy requiring a TTY conflicts with pipelining.
- The sudoers link was pinned to the older 1.9.14 manual. Replaced it with sudo's current, unversioned sudoers manual URL.

## Review Notes
The YAML task, play, block, inventory, module, and environment examples use current supported names and syntax. The `ansible-playbook --ask-become-pass` and ad hoc `ansible --become` commands are current. The sudoers policy and `visudo -cf`/`sudo -l -U` options are valid; `sudo -l -U` must be run by root or another user authorized to list the target user's privileges. Paths such as `/usr/sbin/visudo` and `/bin/bash` remain operating-system-specific, which the post appropriately tells readers to test.
