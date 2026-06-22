# Validation Summary: How to Fix 'Connection Refused' Errors in Ansible

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible inventory and SSH connection configuration
- OpenSSH client and server configuration
- Linux networking diagnostics
- UFW, firewalld, and iptables firewall configuration
- AWS EC2 security groups
- Azure Network Security Groups
- Bastion/jump host SSH configuration

## Sources Consulted
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible reboot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible ping module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible add_host module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html
- OpenSSH ssh_config manual: https://man.openbsd.org/ssh_config
- AWS CLI authorize-security-group-ingress documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Azure CLI network NSG rule documentation: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- firewalld open port/service documentation: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- Local command help for ssh, nc, ss, and sudo where available.

## Issues Found
- The Ansible SSH timeout example used `[ssh_connection] connect_timeout = 30`, which is not the documented SSH connection plugin configuration key. Changed it to `[ssh_connection] timeout = 30`, matching Ansible's documented `timeout` option.
- The `ssh_args` timeout example replaced Ansible's documented default SSH arguments and would drop `ControlMaster` and `ControlPersist`. Updated the example to preserve the default `-C -o ControlMaster=auto -o ControlPersist=60s` options while adding `ConnectTimeout` and `ConnectionAttempts`.
- The Debian/Ubuntu iptables persistence command used `sudo iptables-save > /etc/iptables/rules.v4`, where the shell redirection would run outside sudo and commonly fail on a root-owned path. Changed it to `sudo sh -c 'iptables-save > /etc/iptables/rules.v4'`.
- The global jump host example used `ssh_args` for ProxyJump, which would replace the default SSH arguments. Changed it to `ssh_common_args`, the documented Ansible option for common extra SSH arguments.

## Review Notes
- Ansible was not installed in the local workspace, so Ansible-specific checks were verified against the latest official Ansible documentation instead of local `ansible-doc` output.
- Some operating system commands vary by distribution and installed packages, such as `ssh` versus `sshd` service names, `iptables` persistence mechanisms, and availability of `telnet`, `netstat`, `nslookup`, or `traceroute`. The post already presents these as troubleshooting examples rather than universal commands.
