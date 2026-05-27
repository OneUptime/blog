# Validation Summary: How to Use Ansible check Mode for Validation Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and modules
- Ansible check mode and diff mode
- Molecule testing
- Molecule Docker driver
- ansible-lint and yamllint
- pytest-testinfra
- GitHub Actions
- GitLab CI

## Sources Consulted
- Ansible check mode and diff mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible built-in module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- ansible.builtin.service_facts documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- community.general.timezone documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- Molecule documentation: https://ansible.readthedocs.io/projects/molecule/
- Molecule Docker driver documentation: https://ansible.readthedocs.io/projects/molecule-plugins/
- pytest-testinfra documentation: https://pytest-testinfra.readthedocs.io/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitLab CI/CD YAML documentation: https://docs.gitlab.com/ee/ci/yaml/

## Issues Found
- The setup command installed `ansible-core`, `molecule-docker`, and `testinfra`. The examples use community collections, current Molecule Docker support is provided through `molecule-plugins[docker]`, and the current Testinfra package name is `pytest-testinfra`. Updated the install command to use `ansible`, `molecule-plugins[docker]`, and `pytest-testinfra`.
- The Molecule Docker platforms used plain OS base images that are not reliable Ansible targets because they may lack Python and systemd setup expected by the playbook. Updated them to Docker images intended for Ansible/Molecule testing.
- The post described check mode and diff mode but did not include a command using them. Added `ansible-playbook playbooks/site.yml --check --diff`.
- The `service_facts` assertion checked `my_service`, but systemd service facts are commonly keyed with the full unit name, such as `my_service.service`. Updated the assertion keys.
- The GitHub Actions matrix included `debian12`, but the Molecule scenario only defines `ubuntu2404` and `rocky9`. Removed `debian12` and updated the Molecule command to limit each matrix job to the selected platform.
- The GitLab CI Molecule job used `docker:latest` and then ran `pip`, which is not available in that image by default. Updated the job to use a Python image with Docker-in-Docker connection variables before installing Molecule.
- The infrastructure example used `ansible.builtin.timezone`, but timezone management is provided by `community.general.timezone`. Updated the FQCN.
- The SSH restart handler used `sshd`, which is correct for many Red Hat-family systems but not Debian/Ubuntu. Updated the handler to choose `ssh` on Debian-family systems and `sshd` elsewhere.
- The common use-case text referred to "this module" even though the article is about validation/testing patterns rather than a single Ansible module. Updated those references.

## Review Notes
The YAML snippets parse successfully. Some examples still depend on environment-specific details, such as Docker-in-Docker runner configuration, service availability, and the placeholder `my_service` application, but they are technically plausible examples rather than complete runnable projects.
