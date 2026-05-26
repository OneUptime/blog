# Validation Summary: How to Use Ansible Conditionals for Cross-Platform Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible facts and conditionals
- Ansible package, service, include_vars, include_tasks, set_fact, get_url, apt, yum/dnf modules
- community.general zypper and ufw modules
- ansible.posix firewalld module
- Cross-platform Linux automation

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- ansible.builtin.gather_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/gather_facts_module.html
- ansible.builtin.package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.dnf/yum module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dnf_module.html
- ansible.builtin.include_vars module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_vars_module.html
- ansible.builtin.first_found lookup documentation: https://docs.ansible.com/projects/ansible-core/2.15/collections/ansible/builtin/first_found_lookup.html
- ansible.builtin.set_fact module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- ansible.builtin.get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- community.general.zypper module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/zypper_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.posix.firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html

## Issues Found
- The architecture mapping example set `arch_map` and `binary_arch` in the same `set_fact` task, while `binary_arch` referenced `arch_map`. Split this into two `set_fact` tasks so the mapping is available before it is used.
- The full playbook example loaded `vars/{{ ansible_os_family }}.yml` through `vars_files`. Because `ansible_os_family` is a gathered fact, this is not reliable at play variable load time. Changed it to a `pre_tasks` `include_vars` task using `with_first_found`, which runs after fact gathering and still allows a default fallback.

## Review Notes
- The examples use FQCNs and module parameters that match the referenced Ansible documentation. The `ansible.builtin.yum` name is currently a compatibility alias/redirect to the DNF implementation in modern ansible-core, so future updates could prefer `ansible.builtin.dnf` or `ansible.builtin.package` for current Red Hat-family examples.
- `community.general` and `ansible.posix` modules are not part of `ansible-core`; users need those collections installed when using `community.general.zypper`, `community.general.ufw`, or `ansible.posix.firewalld`.
- `ansible-playbook` was not installed in the local workspace, so Ansible's native syntax checker could not be run. The Markdown YAML code fences were parsed successfully with PyYAML.
