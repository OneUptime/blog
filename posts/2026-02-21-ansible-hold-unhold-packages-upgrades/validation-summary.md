# Validation Summary: How to Use Ansible to Hold/Unhold Packages from Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Debian/Ubuntu package management
- dpkg selections
- APT package holds and preferences
- RHEL/CentOS package management
- DNF versionlock
- Kubernetes package upgrade workflow

## Sources Consulted
- Ansible `ansible.builtin.dpkg_selections` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dpkg_selections_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `community.general.dnf_versionlock` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/dnf_versionlock_module.html
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/versionlock.html
- Debian `apt-mark(8)` man page: https://manpages.debian.org/unstable/apt/apt-mark.8.en.html
- Debian `apt_preferences(5)` man page: https://manpages.debian.org/unstable/apt/apt_preferences.5.en.html
- Red Hat package replacement documentation for `python3-dnf-plugin-versionlock`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/package-replacements_changes-to-packages

## Issues Found
- The DNF versionlock `changed_when` examples checked for `Added` and `Deleted`, but documented/versionlock output uses `Adding versionlock` and `Deleting versionlock`. Updated those checks so Ansible reports changes correctly.
- The Debian held-package filters searched for any occurrence of `hold`, which could match package names or unrelated text. Updated the command and Ansible filters to match selections ending in `hold`.
- The APT pinning explanation said a priority of `1001` or higher forces a version. Debian's `apt_preferences(5)` documents the threshold as `1000` or higher. Updated the explanation while leaving the example priority at `1001`.

## Review Notes
- The RHEL examples use `ansible.builtin.command` for `dnf versionlock`, which is valid, but `community.general.dnf_versionlock` is available for users who can depend on the `community.general` collection.
- The Kubernetes version string is plausible for the modern Kubernetes package repositories, but readers should always confirm the exact package version available in their configured repository before running the upgrade playbook.
