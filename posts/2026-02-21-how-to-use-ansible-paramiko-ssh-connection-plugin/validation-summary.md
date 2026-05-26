# Validation Summary: How to Use Ansible paramiko SSH Connection Plugin

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-core connection plugins
- ansible.builtin.paramiko_ssh
- ansible.builtin.ssh
- ansible.netcommon.network_cli
- Paramiko
- SSH and host key handling
- Ansible Vault

## Sources Consulted
- Ansible `ansible.builtin.paramiko_ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/paramiko_ssh_connection.html
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible `ansible.netcommon.network_cli` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- Ansible connection methods and details documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- Ansible-core 2.20 porting guide: https://docs.ansible.com/projects/ansible-core/devel/porting_guides/porting_guide_core_2.20.html
- Paramiko documentation: https://docs.paramiko.org/en/latest/
- Local `ansible-doc` checks against ansible-core 2.20.6 and ansible-core 2.21.0 installed into temporary target directories.

## Issues Found
- The post presented `paramiko_ssh` as a current connection plugin. ansible-core 2.20 marks it deprecated, and ansible-core 2.21 removes it. Updated the post to scope the plugin to ansible-core versions before 2.21 and recommend native `ssh` for 2.21 and later.
- Several examples used the legacy selector `paramiko`. Updated command-line, inventory, playbook, and `ansible.cfg` examples to use the documented plugin name `paramiko_ssh`.
- The installation section implied Paramiko is usually installed with Ansible and suggested `pip install ansible[paramiko]`. Updated it to install `paramiko` explicitly and to pin `ansible-core<2.21` when the removed connection plugin is required.
- The configuration snippet used invalid or misleading options: `connect_timeout` is not the documented setting, `use_agent` is not a documented `paramiko_ssh` plugin option, and `host_key_checking` was described as a known_hosts path. Replaced these with documented options and corrected the comments.
- The network-device guidance used plain `connection: paramiko` with `raw` as the main network automation pattern. Updated it to recommend `ansible.netcommon.network_cli` and `ansible_network_cli_ssh_type: paramiko` for cases that need Paramiko as the SSH backend.
- The performance section described Paramiko as having its own connection pool controlled by `forks`. Updated it to use Ansible's `use_persistent_connections` setting and clarified that `forks` controls host parallelism.
- The Windows control-node wording suggested Cygwin as a normal control-node option. Updated the wording to WSL control environments.

## Review Notes
The article is now accurate for legacy ansible-core versions that still include `paramiko_ssh`, but it should be treated as legacy guidance. For new Ansible installations, especially ansible-core 2.21 and later, the native `ssh` connection plugin is the supported path.
