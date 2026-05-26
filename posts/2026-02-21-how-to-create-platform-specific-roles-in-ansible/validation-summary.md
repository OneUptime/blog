# Validation Summary: How to Create Platform-Specific Roles in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible facts
- Ansible task includes and variable includes
- Ansible package, service, dnf, apt, deb822_repository, template, command, shell, and systemd_service modules
- Ansible first_found lookup
- NGINX package repositories
- NodeSource Node.js package repositories
- SELinux booleans with ansible.posix

## Sources Consulted
- Ansible include_vars module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible first_found lookup: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/first_found_lookup.html
- Ansible package module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible dnf module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible apt_key module notes and deprecation guidance: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible deprecated plugins index: https://docs.ansible.com/ansible-core/devel/collections/deprecations.html
- Ansible deb822_repository module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible systemd_service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible command and shell modules: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html and https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/shell_module.html
- ansible.posix.seboolean module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/seboolean_module.html
- Ansible common OS facts: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Official NGINX Linux package documentation: https://nginx.org/en/linux_packages.html
- NodeSource distributions documentation: https://github.com/nodesource/distributions/blob/master/DEV_README.md
- Official Node.js EOL information: https://nodejs.org/en/about/eol

## Issues Found
- The Debian NGINX example used `ansible.builtin.apt_key` and `ansible.builtin.apt_repository`, which are deprecated in current ansible-core documentation and scheduled for removal. Replaced them with `ansible.builtin.deb822_repository`, added `python3-debian` as a prerequisite, and made the apt cache update conditional on repository changes.
- The Red Hat package examples used `ansible.builtin.yum`; current ansible-core routes `yum` to `dnf`, and the `dnf` module is the current documented module. Updated the Red Hat NGINX and Node.js examples to use `ansible.builtin.dnf`.
- The post referred generically to CentOS in examples that now use `dnf`. Updated the wording to CentOS Stream to match current RHEL-family package manager expectations.
- The systemd-specific handler used the `ansible.builtin.systemd` alias. Updated it to the current `ansible.builtin.systemd_service` module name.
- The Node.js example defaulted to Node.js 20, which is end-of-life as of this validation date. Updated the default version to Node.js 22 and kept the NodeSource repository format aligned with current NodeSource documentation.
- The NodeSource Debian setup example used deprecated APT repository/key modules. Replaced the repository setup with `ansible.builtin.deb822_repository`, added `python3-debian`, and made the apt cache update conditional on repository changes.

## Review Notes
The remaining examples are technically valid as role patterns. Some production roles may still need additional platform-specific handling, such as package availability differences, repository pinning, GPG fingerprint verification, and collection installation for `ansible.posix`.
