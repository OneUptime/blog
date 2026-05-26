# Validation Summary: How to Configure Multiple Platforms in Molecule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker driver
- Docker container test platforms
- YAML configuration
- Ansible verifier playbooks
- Testinfra / pytest-testinfra
- GitHub Actions

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule pre ansible-native configuration reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible check mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Testinfra module documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- Geerlingguy Fedora 43 Ansible Docker image listing: https://hub.docker.com/r/geerlingguy/docker-fedora43-ansible
- Fedora lifecycle reference data: https://eol.fyi/products/fedora

## Issues Found
- The comprehensive platform example used Fedora 39 (`fedora39` and `geerlingguy/docker-fedora39-ansible:latest`). Fedora 39 is end-of-life, so it is a poor current example for broad compatibility testing. Updated the example to Fedora 43 (`fedora43` and `geerlingguy/docker-fedora43-ansible:latest`), which has a current Geerlingguy Ansible test image and is listed as an active Fedora release in lifecycle data.

## Review Notes
- The Molecule examples use the pre ansible-native `driver`, `platforms`, `provisioner`, and `verifier` structure. This remains documented for compatibility, but Molecule's current documentation also describes a newer ansible-native approach.
- The Docker driver fields used in the examples, including `image`, `command`, `privileged`, `volumes`, `tmpfs`, `cgroupns_mode`, and `pre_build_image`, are consistent with Molecule's documented driver-specific platform properties.
- The `molecule converge -- --limit ...` and `molecule verify -- --limit ...` examples are consistent with Molecule's documented pass-through of extra arguments to `ansible-playbook`.
- Local Molecule command validation was not run because Molecule is not installed in the workspace Python environment, and creating a temporary virtual environment failed because `ensurepip` / `python3-venv` is unavailable.
