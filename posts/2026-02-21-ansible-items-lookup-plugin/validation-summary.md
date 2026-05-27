# Validation Summary: How to Use the Ansible items Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible lookup plugins
- Ansible `ansible.builtin.items` lookup
- Ansible `loop` and `with_items`
- Ansible `flatten` filter
- Ansible package, apt, user, service, file, and iptables modules
- YAML playbooks

## Sources Consulted
- Ansible documentation: `ansible.builtin.items` lookup plugin: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/items_lookup.html
- Ansible documentation: loops and migrating from `with_items` to `loop`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible documentation: lookup plugins, `lookup`, `query`, and `wantlist`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible documentation: `ansible.builtin.package` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible documentation: `ansible.builtin.apt` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: `ansible.builtin.user` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible documentation: `ansible.builtin.service` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible documentation: `ansible.builtin.file` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible documentation: `ansible.builtin.iptables` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html

## Issues Found
- The introduction said the `items` lookup is the mechanism behind the modern `loop` keyword when passing a flat list. Ansible's loop documentation states that `loop` is equivalent to `with_list`, while `with_<lookup>` constructs rely on lookup plugins. Updated the sentence to say modern Ansible usually writes simple list iteration with `loop`.
- The dynamic list section said lists could be conditionally included in the `items` lookup, but the example builds a list with Jinja list concatenation and loops over it directly. Updated the sentence to describe conditionally including lists before looping.
- The directory/file structure section claimed to create directories and files, but the example only uses `state: directory`. Updated the wording to say it creates directories.
- The string gotcha said passing a string to `loop` iterates over each character. Current Ansible documentation states that `loop` requires list input and will not accept a string. Updated the tip to describe the error behavior and mention `query(...)` or `lookup(..., wantlist=True)`.

## Review Notes
The examples use short lookup names such as `lookup('items', ...)`, which are valid for built-in plugins. Ansible documentation recommends fully qualified collection names such as `ansible.builtin.items` for unambiguous linking and avoiding collection name conflicts, but this is a best-practice improvement rather than a correctness issue.
