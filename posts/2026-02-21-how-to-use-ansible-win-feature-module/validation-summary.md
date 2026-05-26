# Validation Summary: How to Use Ansible win_feature Module for Windows Features

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.windows collection
- ansible.windows.win_feature
- ansible.windows.win_reboot
- ansible.windows.win_service
- ansible.windows.win_uri
- Windows Server roles and features
- PowerShell ServerManager cmdlets
- IIS, DNS, DHCP, .NET Framework, SMBv1

## Sources Consulted
- Ansible documentation: ansible.windows.win_feature module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_feature_module.html
- Ansible documentation: ansible.windows.win_service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible documentation: ansible.windows.win_uri module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_uri_module.html
- Ansible documentation: playbook loops, retries, and until - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Microsoft Learn: Get-WindowsFeature - https://learn.microsoft.com/en-us/powershell/module/servermanager/get-windowsfeature
- Microsoft Learn: Install-WindowsFeature - https://learn.microsoft.com/en-us/powershell/module/microsoft.windows.servermanager.migration/install-windowsfeature
- Microsoft Learn: Detect, enable, and disable SMBv1, SMBv2, and SMBv3 in Windows - https://learn.microsoft.com/en-us/windows-server/storage/file-server/troubleshoot/detect-enable-and-disable-smbv1-v2-v3
- Microsoft Tech Community: Stop using SMB1 - https://techcommunity.microsoft.com/t5/Storage-at-Microsoft/Stop-using-SMB1/ba-p/425858

## Issues Found
- The removal examples used `SMB1Protocol` with `ansible.windows.win_feature`. The Ansible module installs and uninstalls Windows Server features using names discoverable through `Get-WindowsFeature`; Microsoft documents `SMB1Protocol` for the Windows Optional Features cmdlets, while Server-side SMBv1 removal with Windows features uses `FS-SMB1`. Changed both `SMB1Protocol` entries to `FS-SMB1`.

## Review Notes
- The `win_feature` module is Windows Server-specific and uses ServerManager cmdlets; the post correctly frames the examples around Windows Server.
- `include_management_tools`, `include_sub_features`, `source`, list-valued `name`, and the `reboot_required` return value match the current Ansible documentation.
- The `source` examples match the documented `\sources\sxs` layout for installation media or a network share.
