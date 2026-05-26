# Validation Summary: How to Configure Ansible to Use a Specific SSH Port

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible inventory variables
- Ansible group_vars
- Ansible configuration
- Ansible CLI extra variables
- OpenSSH client configuration
- SSH bastion / ProxyJump configuration
- UFW, firewalld, and SELinux port configuration through Ansible modules

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible variable usage and precedence: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.posix.firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- community.general.seport module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/seport_module.html
- OpenSSH ssh_config manual: https://man.openbsd.org/ssh_config

## Issues Found
- The environment variable example used `export ANSIBLE_REMOTE_PORT=2222` while describing a single-command override. Changed it to inline environment assignment so the setting applies only to the shown command.
- The SSH config precedence note said to avoid setting `ansible_port` in ansible.cfg. `ansible_port` is an inventory/variable setting, not an ansible.cfg key. Changed the wording to distinguish inventory `ansible_port` from ansible.cfg `remote_port`.
- The bastion example used `ProxyJump=bastion01`, but OpenSSH `ProxyJump` does not automatically apply Ansible inventory variables for the jump host. Changed it to use the bastion IP and port directly.
- The SSH restart handler always used service name `sshd`, which is commonly incorrect on Debian-family systems. Added an OS-family-based `ssh_service_name` variable and used it in the handler.

## Review Notes
Ansible was not installed in the local workspace, so CLI syntax was checked against official documentation rather than local `ansible-playbook --syntax-check`. The post uses collection modules from `community.general` and `ansible.posix`; those collections may need to be installed when using `ansible-core` alone.
