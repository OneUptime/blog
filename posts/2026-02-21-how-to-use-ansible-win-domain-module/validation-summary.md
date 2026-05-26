# Validation Summary: How to Use Ansible win_domain Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.windows collection
- microsoft.ad collection
- Active Directory Domain Services
- Windows Server DNS
- PowerShell AD DS, DNS, dcdiag, repadmin, and netdom commands

## Sources Consulted
- Ansible documentation: microsoft.ad.domain module - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/domain_module.html
- Ansible documentation: microsoft.ad.domain_child module - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/domain_child_module.html
- Ansible documentation: microsoft.ad migration guide - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/ad/docsite/guide_migration.html
- Ansible documentation: removed ansible.windows.win_domain module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_domain_module.html
- Ansible documentation: ansible.windows.win_feature module - https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_feature_module.html
- Ansible collection source: microsoft.ad domain.ps1 - https://raw.githubusercontent.com/ansible-collections/microsoft.ad/main/plugins/modules/domain.ps1
- Ansible collection source: microsoft.ad domain_child.ps1 - https://raw.githubusercontent.com/ansible-collections/microsoft.ad/main/plugins/modules/domain_child.ps1
- Microsoft Learn: Install-ADDSForest - https://learn.microsoft.com/en-us/powershell/module/addsdeployment/install-addsforest
- Microsoft Learn: Install-ADDSDomain - https://learn.microsoft.com/en-us/powershell/module/addsdeployment/install-addsdomain

## Issues Found
- The post described `ansible.windows.win_domain` as the active module. That module was removed in ansible.windows 3.0.0, so the post now identifies `microsoft.ad.domain` as the replacement.
- The post claimed one module could create child domains and domain trees. Current Ansible support uses `microsoft.ad.domain` for new forests and `microsoft.ad.domain_child` for child and tree domains, so the descriptions and summary were corrected.
- The child-domain playbook used `microsoft.ad.domain` with invalid child-domain parameters such as `parent_domain_name`, `domain_admin_user`, and `domain_admin_password`. The task now uses `microsoft.ad.domain_child` and removes unsupported parameters for a default child-domain creation.
- The post said AD DS must be installed before using the domain module. The current microsoft.ad modules install the AD DS role during promotion, so the prerequisites now state that explicit `win_feature` installation is optional.
- The forest creation comments said the server reboots automatically while the example performs a manual reboot based on `reboot_required`. The wording was corrected.
- The OU creation example attempted to create nested OUs under `OU=Corp` without first creating `OU=Corp`. The missing parent OU was added.

## Review Notes
- The microsoft.ad documentation recommends using `reboot: true` for domain promotion when possible. The post's explicit `win_reboot` pattern is still documented and valid, but future revisions could simplify the examples by letting the module manage the reboot.
