# Validation Summary: How to Use Ansible to Write Distribution-Agnostic Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible facts
- Ansible builtin modules
- Ansible community collections
- Linux service managers
- Linux firewalls
- Molecule testing

## Sources Consulted
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.include_vars` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible `ansible.builtin.first_found` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Molecule configuration documentation: https://ansible.readthedocs.io/projects/molecule/configuration/

## Issues Found
- The role listed Archlinux and Alpine variable files but only showed Debian, RedHat, and Suse examples. Added Archlinux and Alpine variable snippets so the complete role example matches the distributions named in the post.
- The `include_vars` example used `with_first_found` without explicitly searching the role `vars` directory. Changed it to the documented `lookup('ansible.builtin.first_found', params)` pattern with `paths: vars`.
- The Debian `a2ensite` command always reported changed because of `changed_when: true`. Replaced that with a `creates` guard for the generated site symlink.
- The systemd-specific example used the older `ansible.builtin.systemd` name. Updated it to the current `ansible.builtin.systemd_service` module name.
- The summary still referred to `with_first_found`; updated it to refer to the `first_found` lookup.
- The common use-case text referred to "this module" even though the post covers patterns, not one module. Updated those references.
- The infrastructure workflow used `ansible.builtin.timezone`, which is not a current builtin module. Changed it to `community.general.timezone`.
- The infrastructure workflow hardcoded Debian-only `/etc/hosts`, UFW, and `sshd` assumptions. Added guarded Debian `/etc/hosts` handling, UFW/firewalld branching, and a distribution-aware SSH service variable.
- The generated compliance script used `/bin/bash`, which is not guaranteed on minimal distributions such as Alpine. Changed it to `/bin/sh`.

## Review Notes
The examples are syntactically valid YAML. Some operational details, such as whether firewalld or UFW is already installed and enabled on a target host, remain environment-specific and would normally be handled by role defaults or preflight tasks in production.
