# Validation Summary: How to Use Ansible with Password-Based SSH Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Vault
- SSH and OpenSSH server configuration
- sshpass
- Linux privilege escalation with sudo/become
- Ansible inventory and ansible.cfg configuration

## Sources Consulted
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible encrypted content usage documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config

## Issues Found
- The post stated that `sshpass` is unconditionally required for password-based SSH. Current Ansible documents `password_mechanism` as configurable, with `ssh_askpass`, `sshpass`, and `disable` choices. I changed the wording to say password-based SSH often uses `sshpass`, and added `password_mechanism = sshpass` to the sample `ansible.cfg` so the prerequisite and configuration match.
- The post said pipelining with password authentication can cause issues because `sshpass` interacts with SSH differently. Ansible documents the main caveat as a conflict with privilege escalation, especially sudo `requiretty`, and notes pipelining is disabled by default. I updated the explanation accordingly.
- The Ubuntu-oriented playbook uses the `sudo` group, but its handler restarted service `sshd`, which is the common RHEL-family service name. I changed the handler to restart the `ssh` service to match the Ubuntu/Debian-style example.
- The hardening example used `ChallengeResponseAuthentication`, which OpenSSH now documents as a deprecated alias for `KbdInteractiveAuthentication`. I changed the task to manage `KbdInteractiveAuthentication no`.
- The second SSH restart handler also used `sshd`; I changed it to restart `ssh` for consistency with the Ubuntu/Debian-style example.

## Review Notes
The examples are technically valid for a Debian/Ubuntu-style target host. For RHEL-family targets, future improvements could mention using the `wheel` group instead of `sudo` and restarting the `sshd` service instead of `ssh`.
