# Validation Summary: How to Fix 'Unreachable' Host Errors in Ansible

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ansible
- Ansible inventory files
- Ansible configuration
- SSH and OpenSSH
- Linux systemd services
- Linux firewall tools
- Network connectivity testing

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible wait_for_connection module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Local OpenSSH manual pages for ssh_config and ssh-keyscan
- Local systemd unit listing for common SSH service names

## Issues Found
- The `ansible.cfg` location comment said to place the file in the project root or `/etc/ansible/`. Ansible loads `ansible.cfg` from the current working directory, the user's home directory, or `/etc/ansible/ansible.cfg`, so the wording was changed to "current working directory or /etc/ansible/".
- The `ssh-keyscan` example comment incorrectly described `StrictHostKeyChecking=accept-new`. `ssh-keyscan` gathers host keys for known_hosts and does not apply that SSH client option. The comment was changed to advise verifying the fingerprint before saving the key.
- The SSH service management examples used only `sshd`, which is common on RHEL-family systems but not universal. Debian/Ubuntu commonly use `ssh.service`, so the examples now show both service names.

## Review Notes
The Ansible inventory variables, SSH connection variables, `ansible-playbook` verbosity examples, `ansible.builtin.ping`, `ansible.builtin.wait_for_connection`, `ansible_ssh_common_args`, ProxyJump usage, and `ansible.cfg` settings reviewed are consistent with current official Ansible documentation. The post intentionally uses generic Linux networking and firewall examples; exact package and service names may still vary by distribution.
