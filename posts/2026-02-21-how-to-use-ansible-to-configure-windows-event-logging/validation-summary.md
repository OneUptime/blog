# Validation Summary: How to Use Ansible to Configure Windows Event Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible Windows modules
- Windows Event Log
- PowerShell event logging
- Windows advanced audit policy
- Windows Event Forwarding
- WinRM

## Sources Consulted
- Ansible `ansible.windows.win_regedit` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_regedit_module.html
- Ansible `ansible.windows.win_shell` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible `ansible.windows.win_service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible `ansible.windows.win_file` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_file_module.html
- Ansible `ansible.windows.win_group_membership` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_group_membership_module.html
- Microsoft `Get-WinEvent` documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent
- Microsoft Eventlog registry key documentation: https://learn.microsoft.com/en-us/windows/win32/eventlog/eventlog-key
- Microsoft `auditpol /set` documentation: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc755264(v=ws.11)
- Microsoft PowerShell logging documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_logging_windows
- Microsoft `wecutil` documentation: https://learn.microsoft.com/en-us/windows/win32/wec/wecutil
- Microsoft source-initiated WEF setup documentation: https://learn.microsoft.com/en-us/windows/win32/wec/setting-up-a-source-initiated-subscription
- Microsoft `wevtutil` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wevtutil

## Issues Found
- The registry retention explanation said `-1` means "never overwrite." Windows stores this as a DWORD value, and Microsoft documents the value as `0xFFFFFFFF`; changed the explanation to use `0xFFFFFFFF`.
- The WEF collector playbook wrote the subscription XML to `C:\Temp\SecuritySubscription.xml` without ensuring `C:\Temp` exists. Added a `win_file` task to create the directory.
- The WEF subscription XML used `<DeliveryMode>Push</DeliveryMode>` and a top-level `<Heartbeat>` element. Microsoft examples for subscription XML use `<ConfigurationMode>Custom</ConfigurationMode>` with `<Delivery Mode="Push">` nested batching and push settings, so the snippet was updated to the documented XML structure.
- The source playbook configured forwarding of Security events but did not grant the forwarding service account access to the Security log. Microsoft documents that `NETWORK SERVICE` must be added to `Event Log Readers` for Security log forwarding, so an Ansible `win_group_membership` task was added.

## Review Notes
The audit policy subcategory names and Ansible module usage are consistent with the referenced documentation. Some audit subcategories, such as Directory Service Access, are only meaningful on systems that provide those audit categories, so production playbooks may need host-role-specific policy lists.
