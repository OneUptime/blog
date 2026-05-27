# Validation Summary: How to Handle Package Dependencies in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible.builtin.apt
- ansible.builtin.dnf
- ansible.builtin.package_facts
- Ansible roles and role dependencies
- APT preferences and package pinning
- Debian and Ubuntu package management
- RHEL package management

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible package_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Debian apt_preferences manpage: https://manpages.debian.org/bookworm/apt/apt_preferences.5.en.html
- PostgreSQL PGDG apt repository documentation and FAQ: https://wiki.postgresql.org/wiki/Apt and https://wiki.postgresql.org/wiki/Apt/FAQ
- dpkg-query manual page: https://man7.org/linux/man-pages/man1/dpkg-query.1.html

## Issues Found
- The build-dependencies section said Debian-based systems use `build-dep`, but the example installed a manual package list. I clarified that Ansible's apt module supports `state: build-dep` for distribution source packages, while upstream builds often require explicitly installing known build packages.
- The broken-dependency repair example used `ansible.builtin.command` to run `apt-get install -f -y`. I changed it to `ansible.builtin.apt` with `state: fixed`, which is the supported apt module state for correcting broken dependencies.
- The APT preferences example pinned PGDG with `Pin: origin apt.postgresql.org`. I changed it to `Pin: release o=apt.postgresql.org`, matching PostgreSQL's documented PGDG pinning pattern and Debian apt preferences release-origin syntax.
- The virtual package check used `ansible.builtin.command` with a shell pipe. The command module does not process shell metacharacters such as `|`, so I changed it to `ansible.builtin.shell` and used `dpkg-query` to inspect installed packages' `Provides` field for `mail-transport-agent`.

## Review Notes
The remaining examples are technically valid, but several are intentionally distribution-specific. Version-pinned package examples such as `libssl1.1=1.1.1f-1ubuntu2.20`, `libc6=2.35-0ubuntu3.4`, and `libgcc-s1=12.3.0-1ubuntu1~22.04` will only work on repositories that still provide those exact package versions.
