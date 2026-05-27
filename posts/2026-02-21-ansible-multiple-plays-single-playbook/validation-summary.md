# Validation Summary: How to Use Multiple Plays in a Single Ansible Playbook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible plays and play-level keywords
- Ansible inventory host patterns
- Ansible facts, variables, and `hostvars`
- Ansible built-in modules
- Ansible POSIX and Cisco IOS collections

## Sources Consulted
- Ansible playbook introduction: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_intro.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible inventory patterns and slicing: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible facts and magic variables: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible variables and scoping: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- `ansible.builtin.set_fact` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible error handling and `any_errors_fatal`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- `ansible.posix.synchronize` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible Cisco IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- `cisco.ios.ios_config` documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- `ansible.builtin.apt` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- `ansible.builtin.uri` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- Updated the `synchronize` task to use `ansible.posix.synchronize`, because the current documentation identifies it as part of the `ansible.posix` collection rather than `ansible-core`.
- Updated the Cisco IOS network example to use `ansible.netcommon.network_cli`, `ansible_network_os: cisco.ios.ios`, and `cisco.ios.ios_config`, matching the current Cisco IOS platform documentation.
- Corrected the cross-play variable explanation. Play-level variables are scoped to their play, but variables created with `set_fact` are host variables available to later plays during the same playbook run.
- Updated the `hostvars` example to read the gathered default IPv4 address through `ansible_facts.default_ipv4.address`, which is the current documented fact namespace.

## Review Notes
The examples are illustrative and depend on inventory groups, target operating systems, services, collections, Python packages, and placeholder URLs being available in the reader's environment. The local environment did not have `ansible-playbook` installed, so syntax checking with Ansible itself could not be run.
