# Validation Summary: How to Use Ansible win_iis_website Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Windows collections
- `community.windows.win_iis_website`
- `community.windows.win_iis_webapppool`
- `community.windows.win_iis_webbinding`
- `ansible.windows.win_feature`
- `ansible.windows.win_file`
- `ansible.windows.win_acl`
- Windows Server IIS

## Sources Consulted
- Ansible documentation: `community.windows.win_iis_website` module - https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_iis_website_module.html
- Ansible documentation: `community.windows.win_iis_webapppool` module - https://docs.ansible.com/ansible/latest/collections/community/windows/win_iis_webapppool_module.html
- Ansible documentation: `community.windows.win_iis_webbinding` module - https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_iis_webbinding_module.html
- Ansible documentation: `microsoft.iis.website` module - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/website_module.html
- Ansible documentation: `microsoft.iis.web_app_pool` module - https://docs.ansible.com/projects/ansible/latest/collections/microsoft/iis/web_app_pool_module.html
- Ansible documentation: `ansible.windows.win_feature` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_feature_module.html
- Ansible documentation: `ansible.windows.win_acl` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_acl_module.html
- Ansible documentation: Installing collections with `ansible-galaxy` - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html

## Issues Found
- The post did not mention that `community.windows.win_iis_website` and `community.windows.win_iis_webapppool` are deprecated in current Ansible documentation and scheduled for removal in `community.windows` 4.0.0. Added a note that new playbooks should use `microsoft.iis.website` and `microsoft.iis.web_app_pool`.
- The HTTPS example used an unsupported `ssl: true` parameter on `community.windows.win_iis_website`. Replaced that with `community.windows.win_iis_webbinding`, which supports `protocol`, `certificate_hash`, `certificate_store_name`, and SNI flags for HTTPS bindings.
- The HTTPS certificate thumbprint variable used an ellipsis placeholder that would not be a valid thumbprint value. Replaced it with a 40-character hexadecimal example value.
- The playbooks grant ACLs to IIS application pool identities and use IIS PowerShell tooling, but the IIS feature list did not include `Web-Scripting-Tools`. Added `Web-Scripting-Tools` to the IIS installation examples because the `win_acl` documentation notes that AppPool identity ACLs require it.

## Review Notes
The legacy `community.windows` examples are now accurate for that module family, but future maintenance should consider migrating the article fully to the supported `microsoft.iis` collection because the legacy IIS modules are deprecated.
