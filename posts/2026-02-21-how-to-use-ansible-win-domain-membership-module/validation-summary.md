# Validation Summary: How to Use Ansible win_domain_membership Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- microsoft.ad collection
- Windows Server
- Active Directory Domain Services
- PowerShell

## Sources Consulted
- Ansible documentation: `microsoft.ad.membership` module - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/membership_module.html
- Ansible documentation: removed `ansible.windows.win_domain_membership` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_domain_membership_module.html
- Ansible documentation: `ansible.windows.win_dns_client` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_dns_client_module.html
- Ansible documentation: `ansible.windows.win_reboot` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_reboot_module.html
- Ansible Core documentation: retries, delay, and until playbook behavior - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Microsoft Learn: Verify that SRV DNS records have been created for a domain controller - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/verify-srv-dns-records-have-been-created
- Microsoft Learn: Win32_ComputerSystem class - https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-computersystem
- Microsoft Learn: Remove-ADComputer cmdlet - https://learn.microsoft.com/en-us/powershell/module/activedirectory/remove-adcomputer

## Issues Found
- The post title, description, introduction, and summary referred to `win_domain_membership` as the active module, but current Ansible documentation says `ansible.windows.win_domain_membership` was removed in `ansible.windows` 3.0.0 and replaced by `microsoft.ad.membership`. I updated the post to identify `microsoft.ad.membership` as the current module while noting that it replaces the removed legacy module.
- The introduction said the module moves servers between OUs. The official `microsoft.ad.membership` documentation says `domain_ou_path` is only used when adding the target host to a domain and is ignored if it is already a member. I changed the wording to say it places new computer accounts into OUs during the join.
- The tag list used `Window`; I corrected it to `Windows`.
- The opening sentence said every Windows server in a corporate environment needs to join a domain. That is too absolute because standalone and workgroup servers are valid configurations. I changed it to "Many Windows servers".
- The bulk provisioning example checked `_ldap._tcp.<domain>` with a default `nslookup` query. Microsoft documents the domain controller locator SRV record as `_ldap._tcp.dc._msdcs.<domain>` and shows using an SRV-capable lookup. I changed the command to `nslookup -type=SRV _ldap._tcp.dc._msdcs.{{ domain_name }}` and updated the sequence diagram accordingly.

## Review Notes
The playbook examples use the current `microsoft.ad.membership` module parameters correctly for domain joins, workgroup changes, hostname changes, OU placement during join, and manual reboot handling through `reboot_required`. The post could optionally mention the module's `reboot: true` parameter in the future, but the current explicit `ansible.windows.win_reboot` tasks are valid.
