# Validation Summary: How to Configure Ansible for Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Windows automation
- WinRM
- PowerShell
- Kerberos, NTLM, Basic, and CredSSP authentication
- Chocolatey
- IIS
- Windows Updates
- Windows services, files, registry, users, groups, firewall, and timezone management

## Sources Consulted
- Ansible: Managing Windows hosts with Ansible: https://docs.ansible.com/projects/ansible/latest/os_guide/intro_windows.html
- Ansible: Windows Remote Management: https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm.html
- Ansible: Kerberos Authentication: https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm_kerberos.html
- Ansible: ansible.windows collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/
- Ansible: ansible.windows.win_updates module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_updates_module.html
- Ansible: ansible.windows.win_powershell module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_powershell_module.html
- Ansible: ansible.windows.win_package module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_package_module.html
- Ansible: chocolatey.chocolatey.win_chocolatey module: https://docs.ansible.com/projects/ansible/latest/collections/chocolatey/chocolatey/win_chocolatey_module.html
- Ansible: microsoft.iis collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/
- Ansible: microsoft.iis.website module: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/website_module.html
- Ansible: microsoft.iis.web_app_pool module: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/web_app_pool_module.html
- Ansible: microsoft.iis.virtual_directory module: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/virtual_directory_module.html
- Microsoft Learn: IISAdministration PowerShell Cmdlets: https://learn.microsoft.com/en-us/iis/get-started/whats-new-in-iis-10/iisadministration-powershell-cmdlets

## Issues Found
- Updated Windows host requirements to match current Ansible guidance: Windows Server 2016/Windows 10 or newer with PowerShell 5.1, with older supported hosts requiring PowerShell 3.0+ and .NET Framework 4.0+.
- Corrected the TrustedHosts comment. The setting controls outbound WinRM trust from that Windows host, not inbound connections from any IP.
- Added the `microsoft.iis` collection install command because current Ansible documentation deprecates the older `community.windows.win_iis_*` modules.
- Quoted the `pip` extras and added the Kerberos extra for `pywinrm` so the dependency command works in shells and supports the authentication examples shown.
- Corrected the Basic authentication guidance. Basic is not HTTP-only; it is for local accounts and should normally be used over HTTPS.
- Replaced deprecated `community.windows.win_iis_*` modules with supported `microsoft.iis` modules and updated the IIS binding syntax accordingly.
- Replaced deprecated `win_updates` `whitelist` with `accept_list`.
- Replaced deprecated `community.windows.win_timezone` redirect with `ansible.windows.win_timezone`.
- Updated the closing collection list to include `microsoft.iis`.

## Review Notes
The `microsoft.iis` modules require the IISAdministration PowerShell module on the managed host. On Windows Server 2016 and newer this is aligned with the IISAdministration module documented by Microsoft, but environments should still verify that the module is available when automating IIS.
