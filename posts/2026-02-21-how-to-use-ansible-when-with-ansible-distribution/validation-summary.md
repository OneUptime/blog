# Validation Summary: How to Use Ansible when with ansible_distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible facts and conditionals
- Debian/Ubuntu APT repositories
- Red Hat family YUM/DNF repositories
- Docker package repositories
- NodeSource Node.js repositories
- Alpine Linux apk packages

## Sources Consulted
- Ansible facts in conditionals: https://docs.ansible.com/projects/ansible-core/2.13/user_guide/playbooks_conditionals.html
- Ansible version test: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- ansible.builtin.deb822_repository module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- ansible.builtin.apt_key module deprecation notes: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- ansible.builtin.command module shell metacharacter behavior: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module behavior: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- ansible.builtin.first_found lookup and include_vars example: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- community.general.apk module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/apk_module.html
- Docker Engine Ubuntu repository documentation: https://docs.docker.com/engine/install/ubuntu/
- NodeSource distributions documentation: https://github.com/nodesource/distributions/blob/master/DEV_README.md

## Issues Found
- The Docker APT examples used `ansible.builtin.apt_repository` with inline repository strings. Updated the Ubuntu and Debian examples to `ansible.builtin.deb822_repository` with `signed_by`, matching Ansible's current recommended replacement for `apt_repository` plus `apt_key` patterns.
- The Ubuntu codename package example used package names like `python3-10`, which are not the Ubuntu package names for interpreter packages. Updated the example to use `python3.8` for focal, `python3.10` for jammy, and `python3.12` for newer releases.
- The NodeSource Debian/Ubuntu example used `ansible.builtin.apt_key`, which depends on the deprecated `apt-key` utility. Replaced it with `ansible.builtin.deb822_repository` and added `python3-debian`, which the module requires.
- The NodeSource Red Hat-family example piped `curl` into `bash` through `ansible.builtin.command`; `command` does not process shell metacharacters such as pipes. Changed it to `ansible.builtin.shell` with `set -o pipefail`, `/bin/bash`, and the current NodeSource repo file guard.
- The Alpine example pinned `nodejs={{ node_version }}`, but apk package version constraints require real package versions rather than a Node.js major version. Changed it to install `nodejs` from the configured Alpine repositories.

## Review Notes
- `ansible-playbook` is not installed in the workspace, so I could not run an Ansible syntax check locally.
- Current Ansible documentation favors `ansible_facts['distribution']` style access, and ansible-core development docs note that injected `ansible_distribution` variables are tied to `INJECT_FACTS_AS_VARS`. The post intentionally focuses on the commonly used injected fact names, so this was left as-is.
