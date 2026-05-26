# Validation Summary: How to Use the difference Filter in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Jinja2 filters
- ansible.builtin.difference
- ansible.builtin.apt
- ansible.builtin.user
- community.general.ufw
- Debian dpkg package queries
- Unix shell commands

## Sources Consulted
- Ansible documentation: ansible.builtin.difference filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/difference_filter.html
- Ansible documentation: Union, intersection and difference of lists - https://docs.ansible.com/projects/ansible/latest/collections/community/general/docsite/filter_guide_abstract_informations_lists_helper.html
- Ansible documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: ansible.builtin.user module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible documentation: community.general.ufw module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Local dpkg command help: `dpkg --help`

## Issues Found
- The post showed exact ordered outputs for `difference` without noting that current Ansible documentation says builtin set filter result order is arbitrary. Updated the introductory explanation, added `| sort` to the basic examples, and clarified the summary.
- The firewall cleanup example used `rule: deny` to close stale ports. The community.general.ufw documentation notes that stale allow rules should be removed with `delete: true`; updated the task to delete stale allow rules instead.
- The complex-data section said `difference` compares complete dictionary objects. Current documentation specifies set filters over list elements and notes set-backed behavior; updated the text to recommend comparing a scalar attribute for dictionaries.

## Review Notes
- The package removal example is technically valid, but enforcing a package whitelist can remove dependencies or essential operational packages if the approved list is incomplete.
- The apt example loops over packages, which works, but the ansible.builtin.apt documentation notes that passing a list directly to `name` is more efficient than looping.
