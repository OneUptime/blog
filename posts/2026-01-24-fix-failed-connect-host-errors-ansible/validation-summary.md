# Validation Summary: How to Fix 'Failed to connect to host' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible
- SSH / OpenSSH
- WinRM
- AWS EC2 security groups
- Linux firewall tools: iptables, nftables, firewalld, ufw
- Docker connection plugin for Ansible
- YAML and INI inventory/configuration formats

## Sources Consulted
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible connection details and host key checking: https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible raw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible known_hosts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- Ansible Windows WinRM documentation: https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm.html
- Ansible amazon.aws.ec2_security_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_security_group_module.html
- Ansible community.docker.docker connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html
- AWS EC2 security group documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- Local OpenSSH client and ssh-keyscan help output from OpenSSH_9.6p1.
- Local ssh_config and sshd_config man pages for OpenSSH directives.

## Issues Found
- The `ansible.cfg` example placed `retries = 3` under `[defaults]`, but the Ansible SSH connection plugin documents SSH reconnection retries under `[connection]` or `[ssh_connection]`. Moved the setting under `[ssh_connection]`.
- The pipelining comment said it "requires tty", which is backwards for the common sudo caveat. Ansible documentation notes that pipelining can conflict with privilege escalation when `requiretty` is enabled, so the comment now says it can require disabling `requiretty` for sudo.
- The Docker connection example used `ansible_connection: docker`. Current Ansible documentation identifies the plugin as `community.docker.docker`, so the example now uses `ansible_connection: community.docker.docker`.

## Review Notes
- The troubleshooting commands and examples are broadly correct, but several are intentionally platform-dependent: service names can be `ssh` or `sshd`, `netstat` may require legacy packages, and `nslookup`, `dig`, `nc`, `telnet`, and `traceroute` may not be installed by default on minimal systems.
- Disabling host key checking and ignoring WinRM certificate validation are correctly scoped as convenience/debugging patterns, but should remain limited to development or controlled environments.
