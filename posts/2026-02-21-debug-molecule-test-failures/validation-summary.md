# Validation Summary: How to Debug Molecule Test Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker scenarios
- Docker CLI
- pytest
- pytest-testinfra
- systemd and Linux package tools

## Sources Consulted
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible debug module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible stat module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- community.general timezone module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- pytest usage documentation: https://docs.pytest.org/en/stable/how-to/usage.html
- pytest-testinfra documentation and package examples: https://testinfra.readthedocs.io/en/latest/ and https://pypi.org/project/pytest-testinfra/
- Docker CLI documentation for containers and networks: https://docs.docker.com/reference/cli/docker/container/ls/ and https://docs.docker.com/reference/cli/docker/network/ls/

## Issues Found
- The Molecule test sequence diagram included `lint` as part of the default `molecule test` flow. Current Molecule workflow documentation no longer lists `lint` in that default sequence. Removed the `lint` node from the diagram.
- The post said `molecule login` lets you SSH into the instance. That can be true for some drivers, but Docker-based Molecule scenarios usually open an interactive shell through the container driver rather than SSH. Reworded this to "log into the instance."
- The idempotence section said shell/command modules always report changed. Ansible's command-style tasks report changed by default, but this can be controlled with options such as `creates`, `removes`, or `changed_when`. Reworded the statement to "report changed by default."

## Review Notes
The remaining commands and examples are technically sound for common Molecule role-debugging workflows. The Docker platform snippet is driver- and image-specific, so future updates should re-check it against the exact Molecule Docker driver version used by the target audience.
