# Validation Summary: How to Automate DHCP Scope Configuration with Ansible on Windows Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- `ansible.windows`
- WinRM
- `pywinrm`
- PowerShell
- Windows Server DHCP
- PowerShell `DhcpServer` cmdlets

## Sources Consulted
- Ansible `ansible.windows.win_powershell` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_powershell_module.html
- Ansible WinRM guide for Windows hosts: https://docs.ansible.com/ansible/latest/os_guide/windows_winrm.html
- Ansible collection installation docs: https://docs.ansible.com/ansible/latest/collections_guide/collections_installing.html
- Microsoft Learn `Add-DhcpServerv4Scope`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4scope?view=windowsserver2025-ps
- Microsoft Learn `Get-DhcpServerv4Scope`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4scope?view=windowsserver2025-ps
- Microsoft Learn `Set-DhcpServerv4OptionValue`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv4optionvalue?view=windowsserver2025-ps
- Microsoft Learn `Get-DhcpServerv4OptionValue`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4optionvalue?view=windowsserver2025-ps
- Microsoft Learn `Set-DhcpServerv4Scope`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv4scope?view=windowsserver2025-ps
- Microsoft Learn Windows Server DHCP quickstart: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/quickstart-install-configure-dhcp-server

## Issues Found
- The post description referenced `win_shell`, but the examples rely on `ansible.windows.win_powershell`; I changed the wording to match the module actually used and documented by Ansible.
- The prerequisites listed `community.windows`, but the post only uses modules from `ansible.windows`; I removed the extra collection and aligned the install command with the shown `requirements.yml`.
- The prerequisites omitted `pywinrm`, which Ansible requires for WinRM connections to Windows hosts; I added the control-node install command from the official WinRM guide.
- The post claimed idempotent behavior while using `win_powershell`, whose documentation states `$Ansible.Changed` defaults to `true`; I updated the scope creation, DHCP option configuration, and deactivation examples to set `$Ansible.Changed = $false` when no change is needed, and I added an option-value comparison before `Set-DhcpServerv4OptionValue`.

## Review Notes
- The examples assume the target host already has the DHCP Server role and the `DhcpServer` PowerShell module available.
- I validated the examples against current Ansible and Microsoft documentation as of 2026-05-07, but I could not execute them end-to-end in this workspace because `ansible-galaxy`, `ansible-doc`, and `pwsh` are not installed here, and there is no Windows DHCP server target to run against.
