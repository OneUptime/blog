# Validation Summary: How to Use Ansible to Pin Package Versions and Prevent Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.dpkg_selections
- ansible.builtin.apt
- ansible.builtin.dnf
- Debian/Ubuntu dpkg and APT preferences
- RHEL/Fedora DNF versionlock

## Sources Consulted
- Ansible `ansible.builtin.dpkg_selections` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dpkg_selections_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible loop and register behavior documentation: https://docs.ansible.com/projects/ansible/8/playbook_guide/playbooks_loops.html
- Debian `apt_preferences(5)` manual page: https://manpages.debian.org/buster/apt/apt_preferences.5.en.html
- DNF command reference: https://dnf.readthedocs.io/en/latest/command_ref.html
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/versionlock.html

## Issues Found
- The APT preferences examples used shell-style `#` comments. The official `apt_preferences(5)` documentation defines `Explanation:` lines for comments in preferences records, so the examples were changed to use `Explanation:` lines.
- The PostgreSQL 16 block examples used `Pin: release *`. To block all versions of the named packages directly, the examples were changed to `Pin: version *` with `Pin-Priority: -1`, matching the specific-form APT preferences syntax for package versions.
- The DNF versionlock `changed_when` checks looked for `Added`, but the DNF versionlock documentation shows `Adding versionlock on:` when adding locks. The add examples now check for that documented output.
- The multi-package DNF versionlock loop checked `item.stdout`, but `item` is the loop package name string. The example now checks the registered result variable for the current iteration.
- The DNF versionlock delete example checked for `Deleted`; the example was updated to check for the actual versionlock deletion output prefix, `Deleting versionlock for:`.

## Review Notes
- The core techniques are valid: `dpkg_selections` supports `hold` and `install`, Ansible `apt` supports exact package versions and `upgrade: dist`, APT preferences support version and package glob pins, and DNF versionlock provides `add`, `list`, `delete`, and `clear`.
- The DNF examples use `ansible.builtin.command` rather than a dedicated versionlock module. That is technically valid because the versionlock functionality is exposed as a DNF plugin command.
