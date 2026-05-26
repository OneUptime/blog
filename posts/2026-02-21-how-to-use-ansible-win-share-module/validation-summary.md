# Validation Summary: How to Use Ansible win_share Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- ansible.windows.win_share
- ansible.windows.win_file
- ansible.windows.win_acl
- ansible.windows.win_acl_inheritance
- Windows SMB shares
- PowerShell SMBShare cmdlets

## Sources Consulted
- Ansible documentation: ansible.windows.win_share module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_share_module.html
- Ansible documentation: ansible.windows.win_acl module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_acl_module.html
- Ansible documentation: ansible.windows.win_acl_inheritance module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_acl_inheritance_module.html
- Ansible documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible documentation: ansible.builtin.subelements filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Microsoft Learn: New-SmbShare - https://learn.microsoft.com/en-us/powershell/module/smbshare/new-smbshare
- Microsoft Learn: Get-SmbShare - https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbshare

## Issues Found
- The post said `win_share` permission parameters accept YAML lists and showed list values for `change` and `read`. Current Ansible documentation defines `full`, `change`, `read`, and `deny` as strings containing comma-separated user lists. I changed the text and examples to use comma-separated strings for `win_share`.
- The full file-server example broke NTFS inheritance but only granted NTFS permissions to `BUILTIN\Administrators`, leaving the departmental groups with share permissions but no corresponding NTFS rights. I changed the share variables to lists for easier looping, joined them when passing values to `win_share`, and added `win_acl` tasks for full, change, and read NTFS permissions.

## Review Notes
The local environment did not have `ansible-galaxy` installed, so the collection installation command was verified against official Ansible documentation rather than local CLI help. The examples use the current `ansible.windows` fully qualified collection names and documented SMB caching modes.
