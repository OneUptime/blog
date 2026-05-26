# Validation Summary: How to Use the Ansible apt Module with Package Version Pinning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.apt
- ansible.builtin.dpkg_selections
- APT package preferences and pin priorities
- Debian and Ubuntu package management

## Sources Consulted
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.dpkg_selections module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dpkg_selections_module.html
- Debian apt_preferences(5) manual page: https://manpages.debian.org/trixie/apt/apt_preferences.5.en.html

## Issues Found
- The APT priority table incorrectly described priority 500 as the default for installed packages and priority 100 as the priority for non-default releases. Updated this to match apt_preferences(5): installed versions default to priority 100, while uninstalled package versions from normal repositories default to 500 when no target release applies.
- The PostgreSQL 16 blocking example used `Pin: release *`. Replaced it with the documented package-specific catch-all form `Pin: version *`, which clearly applies the negative priority to all versions of the listed packages.
- The conflict-resolution text said apt simply uses the highest priority for conflicting pins. Updated it to reflect apt_preferences(5): the first matching specific-form record determines priority; if no specific-form record matches, apt uses the highest matching generic-form priority.

## Review Notes
The Ansible module usage, exact-version package syntax, `allow_downgrade`, and `dpkg_selections` hold/install examples were verified against current Ansible documentation. The post uses `yes` boolean values in YAML examples; these remain accepted YAML/Ansible syntax, though many newer playbooks prefer `true`/`false` for readability.
