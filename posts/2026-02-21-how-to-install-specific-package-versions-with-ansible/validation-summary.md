# Validation Summary: How to Install Specific Package Versions with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.apt
- ansible.builtin.dnf
- ansible.builtin.pip
- ansible.builtin.package_facts
- ansible.builtin.dpkg_selections
- APT / apt-cache
- DNF / dnf versionlock
- Python package requirement specifiers / PEP 440

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible package_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible dpkg_selections module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dpkg_selections_module.html
- Ubuntu apt-cache manual page: https://manpages.ubuntu.com/manpages/jammy/man8/apt-cache.8.html
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF versionlock plugin documentation: https://dnf-plugins-core.readthedocs.io/en/stable/versionlock.html
- pip requirement specifiers documentation: https://pip.pypa.io/en/latest/reference/requirement-specifiers/
- PEP 440: https://peps.python.org/pep-0440/

## Issues Found
- The introduction claimed the post covered specific versions on every major platform Ansible supports, but the article only covers apt, dnf, and pip. Changed this to "common package ecosystems Ansible supports."
- The apt section used concrete version examples without making clear that they must come from the target host's configured repositories. Added a sentence clarifying that the versions are examples and should be replaced with repository-available versions.
- The RHEL versionlock example used `changed_when: true`, which reports a change on every run. Updated it to register the command output and mark changed only when `dnf versionlock add` reports an added lock.
- The full Debian/Ubuntu workflow used `redis` as the package key even though the post consistently installs `redis-server` in the apt examples. Updated the workflow key to `redis-server`.

## Review Notes
The Ansible module parameters and package version syntaxes are current: apt accepts exact versions as `name=version`, dnf accepts package specs like `name-version-release`, dnf and apt expose `allow_downgrade`, pip accepts standard requirement specifiers, and `dpkg_selections` supports `selection: hold`. Exact package version strings remain repository- and distribution-specific, so readers should always use `apt-cache policy`, `apt-cache madison`, `dnf list --showduplicates`, or equivalent repository queries before pinning versions.
