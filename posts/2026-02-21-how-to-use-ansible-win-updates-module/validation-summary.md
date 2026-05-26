# Validation Summary: How to Use Ansible win_updates Module for Windows Updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- Windows Update Agent
- Windows Server Update Services (WSUS)
- Windows Registry
- PowerShell
- YAML playbooks

## Sources Consulted
- Ansible official documentation: ansible.windows.win_updates module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_updates_module.html
- Ansible official documentation: ansible.windows.win_reboot module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_reboot_module.html
- Ansible official documentation: ansible.windows.win_uri module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_uri_module.html
- Ansible official documentation: ansible.windows.win_service module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible official documentation: ansible.windows.win_regedit module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_regedit_module.html
- Microsoft Learn: Manage additional Windows Update settings, https://learn.microsoft.com/en-us/windows/deployment/update/waas-wu-settings

## Issues Found
- The description said the article covered scheduling, but the examples cover filtering, reboots, and controlled rollouts rather than actual scheduling. Changed "scheduling" to "reboots".
- The introduction claimed `win_updates` filters by severity. The official `ansible.windows.win_updates` parameters support category filtering and accept/reject lists for update titles or KB numbers, not a severity parameter. Changed the wording to "category or KB article".
- The "Installing All Available Updates" example claimed to install everything available but listed only selected categories. Changed `category_names` to `'*'`, which the official module documentation defines as matching all categories.
- The specific KB example used `accept_list` without broadening `category_names`; the official documentation notes `accept_list` only applies to updates found by `category_names`. Added `category_names: '*'` so the KB filter can apply across all categories.
- The WSUS registry example set `WUServer` and `UseWUServer` but omitted `WUStatusServer`, which Microsoft documents as part of WSUS policy configuration. Added a `WUStatusServer` registry task using the same WSUS URL.

## Review Notes
Ansible was not installed in the local environment, so `ansible-doc` and local playbook syntax validation could not be run. The review was completed against current official Ansible and Microsoft documentation.
