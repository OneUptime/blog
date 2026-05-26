# Validation Summary: How to Use Ansible WinRM Connection for Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Windows Remote Management (WinRM)
- pywinrm
- Kerberos
- NTLM
- CredSSP
- PowerShell
- IIS
- Chocolatey
- Windows Firewall

## Sources Consulted
- Ansible Windows Remote Management documentation: https://docs.ansible.com/ansible/latest/os_guide/windows_winrm.html
- Ansible Windows usage documentation: https://docs.ansible.com/ansible/latest/os_guide/windows_usage.html
- ansible.windows.win_feature module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_feature_module.html
- ansible.windows.win_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_service_module.html
- ansible.windows.win_package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_package_module.html
- community.windows.win_firewall_rule module documentation: https://docs.ansible.com/ansible/latest/collections/community/windows/win_firewall_rule_module.html
- chocolatey.chocolatey.win_chocolatey module documentation: https://docs.ansible.com/ansible/latest/collections/chocolatey/chocolatey/win_chocolatey_module.html
- microsoft.iis.website module documentation: https://docs.ansible.com/ansible/latest/collections/microsoft/iis/website_module.html
- community.windows.win_iis_website deprecation notice: https://docs.ansible.com/ansible/latest/collections/community/windows/win_iis_website_module.html
- Ansible ConfigureRemotingForAnsible.ps1 script: https://raw.githubusercontent.com/ansible/ansible-documentation/devel/examples/scripts/ConfigureRemotingForAnsible.ps1

## Issues Found
- CredSSP authentication was shown only with the Python dependency and Ansible variables. Ansible's WinRM documentation states that CredSSP is not enabled by default on Windows hosts, so I added the required `Enable-WSManCredSSP -Role Server -Force` PowerShell command.
- The complete playbook used `win_iis_website`, which is deprecated in the `community.windows` collection and scheduled for removal. I replaced it with the supported `microsoft.iis.website` module and updated the binding syntax to the current module format.

## Review Notes
- The post's WinRM connection variables, ports, certificate-validation setting, pywinrm dependency, Windows module examples, and timeout variables match current Ansible documentation.
- The article uses short module names for several Windows modules. These remain common in examples, but future revisions could use fully qualified collection names consistently for clearer collection requirements.
