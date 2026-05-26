# Validation Summary: How to Use Ansible Facts to Get Network Interface Information

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible facts and fact gathering
- Ansible playbooks
- Jinja2 templates
- Linux network interface facts
- ansible.builtin.debug
- ansible.builtin.set_fact
- ansible.builtin.template
- ansible.builtin.iptables

## Sources Consulted
- Ansible documentation: Discovering variables, facts, and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: ansible.builtin.setup module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible documentation: ansible.builtin.template module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible documentation: ansible.builtin.set_fact module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible documentation: ansible.builtin.iptables module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible documentation: ansible.builtin.extract filter - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/extract_filter.html

## Issues Found
- The detailed IP list example claimed to include interface names but only produced a list of addresses. Updated the `set_fact` task to build dictionaries containing both `interface` and `address`.
- The VLAN matching regex was over-escaped for a YAML single-quoted string. Updated it so the regex matches dotted VLAN interface names such as `eth0.100`.
- The firewall example claimed to allow traffic on all active interfaces but only looped over loopback, Docker, and bridge-like names. Updated the loop to iterate over all interfaces and added a `when` condition checking each interface's `active` fact.
- The management network regex used unescaped dots, which could match unintended addresses. Updated the variable to a single-quoted regex with escaped dots.

## Review Notes
- The examples rely on Linux network fact gathering, which depends on the `ip` binary, commonly provided by `iproute2`.
- Hosts without a default IPv4 route, DNS nameserver facts, or IPv4 addresses on an interface may need additional `default()` guards in production playbooks.
