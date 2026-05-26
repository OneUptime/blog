# Validation Summary: How to Use Ansible to Configure Windows Network Settings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.windows collection
- community.windows collection
- Windows PowerShell networking cmdlets
- Windows DNS client configuration
- Windows Firewall
- Windows NIC teaming

## Sources Consulted
- Ansible `ansible.windows.win_dns_client` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_dns_client_module.html
- Ansible `ansible.windows.win_firewall` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_firewall_module.html
- Ansible `community.windows.win_firewall_rule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_firewall_rule_module.html
- Ansible `ansible.windows.win_shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Microsoft NetTCPIP PowerShell module documentation: https://learn.microsoft.com/en-us/powershell/module/nettcpip/
- Microsoft `Set-DnsClient` documentation: https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclient
- Microsoft `Set-NetConnectionProfile` documentation: https://learn.microsoft.com/en-us/powershell/module/netconnection/set-netconnectionprofile
- Microsoft `New-NetLbfoTeam` documentation: https://learn.microsoft.com/en-us/powershell/module/netlbfo/new-netlbfoteam

## Issues Found
- The static IP examples removed all IP addresses and all routes for the adapter even though the comments described removing the IPv4 address and gateway. I changed the commands to use `-AddressFamily IPv4` for `Remove-NetIPAddress` and `-DestinationPrefix "0.0.0.0/0"` for `Remove-NetRoute`.
- The firewall example used `community.windows.win_firewall`, which is now a deprecated redirect. I changed it to the current `ansible.windows.win_firewall` module name.
- The practical considerations said to use `--check` to verify what would change before applying. Several examples use custom `win_shell` scripts, so that statement was too broad. I updated it to recommend `--check` only for module-backed tasks that support it, and read-only validation or PowerShell `-WhatIf` logic for custom shell scripts.

## Review Notes
- The post relies heavily on `win_shell`, so many tasks are examples rather than fully idempotent Ansible resources. That is technically valid for Windows network configuration, but future improvements could use modules where available and add explicit `changed_when` logic for shell-backed tasks.
- The NIC teaming section uses LBFO cmdlets, which remain documented for Windows Server, but environments using Hyper-V switch embedded teaming or newer SDN designs may prefer different teaming approaches.
