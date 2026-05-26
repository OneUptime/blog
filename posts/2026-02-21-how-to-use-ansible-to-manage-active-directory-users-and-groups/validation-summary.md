# Validation Summary: How to Use Ansible to Manage Active Directory Users and Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- microsoft.ad Ansible collection
- ansible.windows Ansible collection
- Active Directory Domain Services
- Windows PowerShell ActiveDirectory module
- Ansible Vault

## Sources Consulted
- Ansible microsoft.ad.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/user_module.html
- Ansible microsoft.ad.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/group_module.html
- Ansible microsoft.ad.ou module documentation: https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/ou_module.html
- Ansible microsoft.ad list values guide: https://docs.ansible.com/ansible/latest/collections/microsoft/ad/docsite/guide_list_values.html
- Ansible ansible.windows.win_shell module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Microsoft Get-ADUser documentation: https://learn.microsoft.com/en-us/powershell/module/activedirectory/get-aduser
- Microsoft about_ActiveDirectory_Filter documentation: https://learn.microsoft.com/en-us/powershell/module/activedirectory/about/about_activedirectory_filter
- Microsoft ConvertTo-Json documentation for Windows PowerShell 5.1: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/convertto-json?view=powershell-5.1
- Microsoft Active Directory security groups documentation: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-security-groups

## Issues Found
- The OU example used `protected: true`. The documented microsoft.ad option is `protect_from_deletion`, so the example was corrected to `protect_from_deletion: true`.
- The prerequisites did not mention the extra authentication requirement when running AD modules from a non-domain-controller Windows host. Added the documented Kerberos/CredSSP credential delegation or domain credential caveat.
- Existing-user operations in the offboarding and password-reset examples used `name` as the selector. The microsoft.ad.user documentation states that `name` is the LDAP object name and recommends `identity` for sAMAccountName/UPN/DN lookups and moves, so those tasks now use `identity`.
- The query examples used `ConvertTo-Json -AsArray`, but `ansible.windows.win_shell` defaults to Windows PowerShell and Windows PowerShell 5.1 does not support `-AsArray`. Replaced those calls with `ConvertTo-Json -InputObject @(...)`, which preserves array JSON output without requiring PowerShell 7.

## Review Notes
- The examples are still illustrative and assume the referenced OUs, groups, inventory group, WinRM configuration, and vault variables already exist.
- The service account SPN example uses the generic `attributes` option for `servicePrincipalName`; this is valid, though the microsoft.ad.user module also provides a dedicated `spn` option.
