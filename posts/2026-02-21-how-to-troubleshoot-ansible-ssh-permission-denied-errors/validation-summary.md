# Validation Summary: How to Troubleshoot Ansible SSH Permission Denied Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible ad hoc commands and playbooks
- Ansible inventory variables
- OpenSSH client and server configuration
- SSH public key authentication
- Linux file permissions
- SELinux troubleshooting

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `ansible.builtin.ping` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible `ansible.builtin.file` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config.5
- Red Hat SELinux documentation for `restorecon` and file contexts: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- Red Hat SELinux documentation for AVC searches with `ausearch`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/using_selinux

## Issues Found
- The SSH key deployment playbook used `ansible.builtin.authorized_key`, but the current documented FQCN is `ansible.posix.authorized_key` and the module is not included in `ansible-core`. Changed the task to use `ansible.posix.authorized_key` and noted that the `ansible.posix` collection is required.
- The playbook set `public_key_file: ~/.ssh/deploy_key.pub` and then read it through the `file` lookup. Ansible lookups execute on the controller and documented examples use explicit controller paths; relying on shell-style `~` expansion here is brittle. Changed the example to derive the path from `lookup('env', 'HOME')` and use the FQCN `lookup('ansible.builtin.file', public_key_file)`.
- The verification task ran `ssh ... deploy@localhost` on the managed host, which tests remote-host-to-itself SSH rather than controller-to-target SSH and usually will not use the controller's private key. Changed the task to delegate to `localhost`, disable privilege escalation for the delegated command, use the matching private key, and connect to `ansible_host | default(inventory_hostname)`.

## Review Notes
- The remaining Ansible snippets use documented modules, keywords, tests, and inventory variables.
- The OpenSSH options and `sshd_config` directives shown are valid. In production, checking effective SSH server configuration may also require reviewing included files and `Match` blocks.
- The restart command uses `systemctl restart sshd`, which is common on RHEL-family systems; some Debian/Ubuntu systems use the `ssh` service name instead.
