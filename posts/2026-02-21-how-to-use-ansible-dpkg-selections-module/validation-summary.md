# Validation Summary: How to Use Ansible dpkg_selections Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.dpkg_selections
- ansible.builtin.apt
- Debian dpkg selections
- APT package management
- Ubuntu package management

## Sources Consulted
- Ansible documentation: ansible.builtin.dpkg_selections module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dpkg_selections_module.html
- Ansible documentation: ansible.builtin.apt module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- dpkg(1) manual, https://man7.org/linux/man-pages/man1/dpkg.1.html
- apt-mark(8) Debian manpage, https://manpages.debian.org/unstable/apt/apt-mark.8.en.html
- apt-get(8) Debian manpage, https://manpages.debian.org/unstable/apt/apt-get.8.en.html
- apt_preferences(5) Debian manpage, https://manpages.debian.org/apt_preferences
- Local command help output for dpkg, apt, and apt-get on the review host

## Issues Found
- The post referred to `apt dist-upgrade`, but the `apt` frontend uses `full-upgrade`; `dist-upgrade` is the `apt-get` command. Updated the hold explanation to mention `apt full-upgrade`, `apt-get upgrade`, and `apt-get dist-upgrade`.
- The held-package audit example filtered any line containing `hold`, which could match package names or other text. Updated it to match the selection column exactly with `^\\S+\\s+hold$`.
- The deinstall section said a package would be removed on the next `apt autoremove`. dpkg selections are just desired states and are applied by frontends that honor selections, such as `apt-get dselect-upgrade`; `autoremove` removes unused automatically installed packages. Updated the wording.
- The purge section could imply that setting `selection: purge` purges immediately. Added a clarification that setting the selection alone does not remove or purge the package immediately.
- The APT preferences comparison table said dpkg holds cannot be overridden by apt. APT has explicit options such as `--ignore-hold` and `--allow-change-held-packages`, so the table now says normal upgrades respect holds but explicit APT options can change held packages.

## Review Notes
The examples use current Ansible FQCNs and documented module parameters. The PostgreSQL package version string is illustrative and repository-specific, so users should verify exact available versions in their configured APT repositories before running the upgrade workflow.
