# Validation Summary: How to Test Ansible Variable Precedence

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible variables and precedence
- Ansible playbooks and built-in modules
- community.general Ansible collection
- Molecule
- Molecule Docker driver
- ansible-lint
- yamllint
- pytest-testinfra
- GitHub Actions
- GitLab CI

## Sources Consulted
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html#understanding-variable-precedence
- Ansible precedence rules documentation: https://docs.ansible.com/projects/ansible-core/2.19/reference_appendices/general_precedence.html
- Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- Molecule Docker example documentation: https://docs.ansible.com/projects/molecule/examples/docker/
- ansible.builtin.service_facts documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- ansible.builtin.stat documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- ansible.builtin.uri documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.hostname documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- community.general.timezone documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html

## Issues Found
- The setup and CI examples installed the older standalone `molecule-docker` package. Updated them to install `"molecule-plugins[docker]"`, matching current Molecule installation guidance for external drivers.
- The examples used `community.general.ufw`, and the corrected timezone task uses `community.general.timezone`, but the setup did not install the collection explicitly. Added `ansible-galaxy collection install community.general` to the setup and CI snippets.
- The GitHub Actions matrix included `debian12`, but the Molecule configuration only declared `ubuntu2404` and `rocky9`. Removed `debian12` from the matrix and changed the Molecule command to limit runs to the matrix platform.
- The GitLab CI job used `docker:latest` and then ran `pip`, which is not available by default in that image. Updated the job to use `docker:stable-dind`, install Python and pip with `apk`, and run pip through `python3 -m pip`.
- The infrastructure workflow used `ansible.builtin.timezone`, which is not a valid built-in module. Changed it to `community.general.timezone`.
- Several generic sections referred to "this module" even though the post is not about a specific Ansible module. Updated those references to "these testing patterns" to avoid a technically misleading claim.

## Review Notes
The post title and description are specifically about testing Ansible variable precedence, but much of the body is a broader Ansible/Molecule testing guide. That is not a code correctness problem, but the post would be clearer if future edits added direct precedence-focused test cases for inventory, group_vars, host_vars, role defaults, and extra vars.
