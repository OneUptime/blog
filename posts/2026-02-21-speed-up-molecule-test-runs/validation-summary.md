# Validation Summary: How to Speed Up Molecule Test Runs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker driver
- Docker
- Ansible Galaxy dependencies
- Ansible fact gathering and fact caching
- Ansible callback plugins
- Mitogen for Ansible
- GNU Make

## Sources Consulted
- Molecule configuration documentation: https://ansible.readthedocs.io/projects/molecule/configuration/
- Molecule custom image documentation: https://ansible.readthedocs.io/projects/molecule/guides/custom-image/
- Molecule workflow reference: https://ansible.readthedocs.io/projects/molecule/workflow/
- Molecule parallel execution guide: https://ansible.readthedocs.io/projects/molecule/guides/parallel/
- Ansible playbook keywords reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible cache plugins documentation: https://docs.ansible.com/ansible/latest/plugins/cache.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.package_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible strategy plugins documentation: https://docs.ansible.com/ansible/latest/plugins/strategy.html
- Mitogen for Ansible documentation: https://mitogen.networkgenomics.com/ansible_detailed.html

## Issues Found
- The Dockerfile example placed a shell comment inside a backslash-continued `apt-get install` command. In a Docker `RUN` shell command, that comment would cause the package install command to end before `apt-transport-https gnupg2`, making the build fail. Removed the inline comment from the package list.
- The callback profiling snippet included both `callbacks_enabled` and the older `callback_whitelist` key. Current Ansible documentation uses `callbacks_enabled`; removed `callback_whitelist` and kept the current setting.
- The retry files section said Ansible creates retry files on failure. Current Ansible versions disable retry files by default, so the text was updated to frame this as relevant when older configuration enables retry files.

## Review Notes
- Molecule now documents `molecule test --all --parallel` for parallel scenario execution. The post's background-process and Makefile examples are still technically valid, but the built-in parallel option would be a useful future improvement.
- The Mitogen section is technically accurate as a strategy-plugin configuration example, but Mitogen compatibility can vary by Ansible version. Readers should test it against their pinned Ansible release before adopting it in CI.
