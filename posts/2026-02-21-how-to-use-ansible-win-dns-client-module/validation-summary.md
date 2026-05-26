# Validation Summary: How to Use Ansible win_dns_client Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- ansible.windows.win_dns_client module
- Windows DNS Client
- PowerShell DnsClient cmdlets
- YAML playbooks

## Sources Consulted
- Ansible documentation: ansible.windows.win_dns_client module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_dns_client_module.html
- Microsoft Learn: Set-DnsClient - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclient
- Microsoft Learn: Set-DnsClientGlobalSetting - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientglobalsetting
- Microsoft Learn: Register-DnsClient - https://learn.microsoft.com/en-us/powershell/module/dnsclient/register-dnsclient
- Microsoft Learn: Resolve-DnsName - https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname
- Microsoft Learn: Get-NetAdapter - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter
- Microsoft Learn: Get-DnsClientServerAddress - https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress

## Issues Found
- The DHCP reset section said an empty `dns_servers` list reverts to DHCP-assigned DNS servers without noting the static-address behavior. Updated it to match Ansible's documented behavior: DHCP-enabled connections use DHCP-assigned values, while statically configured connections disable DNS lookup.
- The post said suffix search lists require `win_shell` and PowerShell. Current `ansible.windows.win_dns_client` supports `suffix_search_list`, so the combined DNS example now configures the suffix search list through the module and reserves PowerShell for connection-specific suffixes and dynamic registration.
- The summary repeated that suffix search lists require PowerShell. Updated it to refer to connection-specific suffixes and dynamic registration instead.

## Review Notes
The examples otherwise match the current module parameters for `adapter_names`, wildcard adapter matching, ordered `dns_servers`, and the documented PowerShell cmdlets used for discovery, verification, resolution tests, connection-specific suffix configuration, and DNS registration.
