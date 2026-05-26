# Validation Summary: How to Use Wildcard Patterns in Ansible Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory patterns
- Ansible ad hoc commands
- Ansible playbooks
- Ansible `--limit` host filtering
- Ansible `apt`, `stat`, and `reboot` modules

## Sources Consulted
- Ansible documentation: Patterns, targeting hosts and groups - https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible source: `InventoryManager` pattern matching implementation using `fnmatch.translate()` - https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/inventory/manager.py
- Ansible documentation: `ansible.builtin.apt` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html

## Issues Found
- The "Wildcard Limitations" section incorrectly stated that Ansible wildcard patterns do not support character classes such as `web-[0-9]*`. Ansible's inventory manager treats non-regex wildcard patterns as shell glob patterns using `fnmatch`, which supports `*`, `?`, and character classes. Updated the limitation to say that wildcards do not support full regular expression syntax, and that regex patterns beginning with `~` should be used for more complex matching.

## Review Notes
- The command examples, `hosts:` usage, pattern union/intersection/exclusion syntax, `--limit` examples, and inventory hostname versus `ansible_host` explanation align with the official Ansible inventory pattern documentation.
- The `apt` example uses valid module parameters (`update_cache: true` and `upgrade: safe`). The short module names used in the post are valid because these modules are included with Ansible, though fully qualified collection names such as `ansible.builtin.apt` are preferred in formal documentation.
