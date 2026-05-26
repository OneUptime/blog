# Validation Summary: How to Use Ansible Ad Hoc Commands with Inventory Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- Ansible inventory patterns
- Ansible INI inventory
- Ansible built-in modules: service, apt, shell

## Sources Consulted
- Ansible Community Documentation: Patterns: targeting hosts and groups - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible Community Documentation: How to build your inventory - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible Community Documentation: Working with command line tools - https://docs.ansible.com/projects/ansible/latest/command_guide/command_line_tools.html
- Ansible Community Documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: ansible.builtin.service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Local parser verification with ansible-core 2.19.0 installed under /tmp and `ansible --list-hosts`.

## Issues Found
- The post described `web[01:03]` and `web[a:c]` as ad hoc inventory pattern ranges. Current Ansible documentation supports bracketed ranges when defining hosts in INI/YAML inventory, while ad hoc host selection uses group position/slice syntax such as `webservers[0:2]`. Updated the section to "Group Slice Patterns" and changed related examples.
- The rolling restart example used `web[01:02]`, which did not match the sample inventory as an ad hoc pattern. Replaced it with the explicit union `web01:web02`.
- The regex example `~10\.0\.1\.*` suggested matching an IP range, but the sample inventory defines aliases like `web01` and stores IPs in `ansible_host`; Ansible patterns match inventory host names/aliases, not the `ansible_host` variable. Replaced it with a hostname-based staging regex.
- The common mistakes section implied quoting made `web[01:03]` a valid ad hoc target range. Updated it to explain that host ranges are for inventory definition and to show group slices or explicit host unions instead.

## Review Notes
The remaining union, intersection, exclusion, wildcard, regex, group slice, `--limit`, multiple inventory, service restart, apt upgrade, and shell examples are consistent with current Ansible documentation. The workspace did not have Ansible installed initially, so ansible-core 2.19.0 was installed into `/tmp` only for parser checks.
