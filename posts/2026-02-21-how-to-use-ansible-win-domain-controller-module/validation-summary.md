# Validation Summary: How to Use Ansible win_domain_controller Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.windows collection
- microsoft.ad collection
- Windows Server Active Directory Domain Services
- Domain controllers and read-only domain controllers
- PowerShell Active Directory cmdlets
- Repadmin

## Sources Consulted
- Ansible documentation: microsoft.ad.domain_controller module - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/domain_controller_module.html
- Ansible documentation: ansible.windows.win_domain_controller module removal notice - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_domain_controller_module.html
- Ansible documentation: microsoft.ad migration guide - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/docsite/guide_migration.html
- Ansible documentation: ansible.windows.win_dns_client module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_dns_client_module.html
- Ansible documentation: ansible.windows.win_feature module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_feature_module.html
- Ansible documentation: ansible.windows.win_reboot module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_reboot_module.html
- Microsoft Learn: Install-ADDSDomainController - https://learn.microsoft.com/en-us/powershell/module/addsdeployment/install-addsdomaincontroller
- Microsoft Learn: Get-ADDomainController - https://learn.microsoft.com/en-us/powershell/module/activedirectory/get-addomaincontroller
- Microsoft Learn: Repadmin /showrepl - https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc742066(v=ws.11)

## Issues Found
- The post described `win_domain_controller` as the active module, but the official Ansible documentation says `ansible.windows.win_domain_controller` was removed in ansible.windows 3.0.0 and replaced by `microsoft.ad.domain_controller`. Updated the title, description, introduction, section heading, and summary to use `microsoft.ad.domain_controller`, matching the module used in the playbooks.
- The feature list said the module configures Global Catalog settings. The current `microsoft.ad.domain_controller` parameters include DNS installation, read-only replica mode, site placement, paths, and reboot handling, but do not expose a general Global Catalog setting. Reworded this to DNS installation and Active Directory site placement.
- The lifecycle diagram and a promotion comment implied automatic reboot behavior. The module only reboots automatically when `reboot: true` is set; the examples use explicit `win_reboot` tasks based on `reboot_required`. Reworded those labels to required reboot behavior.
- Corrected the tag from `Window` to `Windows`.

## Review Notes
The manual `win_reboot` pattern shown in the examples is valid because `microsoft.ad.domain_controller` returns `reboot_required`, but Ansible's current documentation highly recommends using `reboot: true` with this module so Ansible manages the reboot phase directly.
