# Validation Summary: How to Use Ansible with Different SSH Ports per Host

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory
- Ansible SSH connection plugin
- Ansible configuration (`ansible.cfg`)
- OpenSSH client configuration
- Dynamic inventory scripts
- UFW firewall management
- OpenSSH server configuration

## Sources Consulted
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible configuration settings (`DEFAULT_REMOTE_PORT` / `remote_port`): https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible dynamic inventory development guide: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/

## Issues Found
- The SSH config example set `ssh_args = -F ~/.ssh/config`, which would replace Ansible's default SSH arguments. Updated it to include Ansible's default compression and connection sharing options along with `-F`.
- The verification section said `ansible_port` shows which port Ansible will use for each host. That is only true when the port is set through that variable; SSH config and `remote_port` can also affect the actual port. Updated the wording to clarify this.
- The SSH port-change playbook used the short `ufw` module name. In current Ansible documentation, UFW is provided as `community.general.ufw`, so the example now uses the fully qualified collection name.
- The SSH port-change playbook restarted a service named `sshd` while using UFW, which is most commonly an Ubuntu/Debian workflow where the OpenSSH service is `ssh`. Updated the task to restart `ssh`.

## Review Notes
The inventory examples, `ansible_port`, `ansible_host`, group and host vars, YAML inventory structure, `remote_port`, dynamic inventory `_meta.hostvars`, and `wait_for` usage align with current Ansible documentation. The `community.general.ufw` module requires the `community.general` collection to be installed when running with ansible-core alone.
