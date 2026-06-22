# Validation Summary: How to Fix 'Permission Denied' SSH Errors in Ansible

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible inventory, playbooks, SSH connection settings, and privilege escalation
- OpenSSH client, ssh-agent, ssh-keygen, ssh-copy-id, and sshd_config
- Linux file permissions, sudoers, SELinux, and SSH authentication logs

## Sources Consulted
- Ansible connection methods and details: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- OpenSSH sshd_config(5) manual: https://man7.org/linux/man-pages/man5/sshd_config.5.html
- OpenSSH ssh-keygen(1) manual: https://man7.org/linux/man-pages/man1/ssh-keygen.1.html
- Local OpenSSH command help/man pages for `ssh`, `ssh-keygen`, `ssh-add`, and `sshd_config`.

## Issues Found
- The post recommended generating an Ed25519 key but several follow-up commands used `id_rsa`. Updated the examples to consistently use `id_ed25519` and `id_ed25519.pub`, while keeping the RSA generation note as a compatibility alternative.
- The permission diagram showed the private key as the file that must be placed in `authorized_keys`. Changed the diagram edge so the public key is shown as the content that belongs in `authorized_keys`.
- The `sshd_config` example showed both `PermitRootLogin no` and `PermitRootLogin prohibit-password` as active settings. Commented the alternative line so readers do not copy conflicting settings.
- The restart instructions implied `systemctl restart sshd` is the universal systemd command. Added the common Debian/Ubuntu `systemctl restart ssh` variant.
- The summary diagram advised checking whether an SSH key is expired. Plain OpenSSH user keys do not expire by default; changed this to checking whether the key has been revoked.

## Review Notes
The remaining examples are technically valid, but several commands are intentionally generic and depend on distribution defaults, local SSH server policy, and the selected key filename. The Ansible CLI was not installed locally, so Ansible-specific syntax was verified against upstream Ansible documentation rather than by executing the commands.
