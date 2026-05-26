# Validation Summary: How to Debug become Failures in Ansible

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ansible privilege escalation (`become`)
- Ansible sudo and su become plugins
- Ansible CLI verbosity and timeout options
- Ansible built-in `command`, `shell`, `ping`, and `raw` modules
- Linux `sudo` and sudoers configuration
- Linux authentication logs

## Sources Consulted
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible sudo become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- Ansible su become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/su_become.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible `command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `ping` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- sudo manual: https://man7.org/linux/man-pages/man8/sudo.8.html
- sudoers manual: https://man7.org/linux/man-pages/man5/sudoers.5.html

## Issues Found
- The post said the "not allowed to execute" sudo error means sudoers explicitly denies the command. This can also happen when no sudoers rule allows the command, so the wording was changed to "does not allow."
- The auth log section implied the diagnostic playbook could always run with `become: true` on the problematic host. Added a note that this requires a privileged connection or alternate account if Ansible become is broken.
- The password prompt section incorrectly implied that setting `ansible_become_pass` customizes prompt detection. Updated it to explain that Ansible's sudo become plugin supplies its own prompt with `sudo -p` when a password is configured, and changed the sudoers example to `passprompt_override`.
- The timing playbook used fragile Jinja date arithmetic with `now()` and `to_datetime`. Replaced it with `date +%s` before and after the become task and integer subtraction.
- The timeout explanation described `ANSIBLE_TIMEOUT` too broadly. Clarified that it is a connection timeout and, for the SSH connection plugin, controls SSH connection establishment and reads from an established connection.
- The comprehensive diagnostic playbook used interactive `sudo -l` and a `requiretty` check that depended on Ansible become. Changed `sudo -l` to `sudo -n -l` and changed the `requiretty` check to use non-interactive sudo without an Ansible become directive.

## Review Notes
The guide is technically relevant and accurate after the fixes. The diagnostic playbooks are examples and still depend on the target host's sudo policy, OS log locations, and available recovery access.
