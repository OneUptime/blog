# Validation Summary: How to Use Ansible package_facts to List Installed Packages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.package_facts
- ansible.builtin.package
- ansible.builtin.command
- Jinja2 templating and filters
- RPM package queries

## Sources Consulted
- Ansible `ansible.builtin.package_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible `ansible.builtin.version` test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/version_test.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- RPM manual, query mode: https://rpm.org/docs/4.19.x/man/rpm.8.html

## Issues Found
- The post said package facts could be filtered by a specific "source/repository" and used Docker repository matching as the example. Ansible documents the package `source` field as where the package information came from, such as `apt`, `rpm`, or `pkg_info`, not as the repository that provided the package. I changed the example to filter packages reported by `apt` using `equalto`.
- The post listed only `apt`, `rpm`, and `pacman` as explicit package managers. That was not incorrect as examples, but it was incomplete against the current documented choices. I changed the wording to "such as" and included additional supported managers.

## Review Notes
- The vulnerability version comparison example is syntactically valid for Ansible's `version` test, but real distribution package vulnerability checks often need package-manager-aware comparisons and vendor security advisory data because distro versions may include epochs, releases, and backported patches.
- Examples using `ansible_date_time` assume normal playbook fact gathering or an explicit `ansible.builtin.setup` run.
