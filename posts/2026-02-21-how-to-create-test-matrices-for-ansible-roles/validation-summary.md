# Validation Summary: How to Create Test Matrices for Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible and ansible-core
- Molecule
- Molecule Docker driver
- GitHub Actions matrix workflows
- Python packaging / pip version specifiers
- Make
- YAML
- Bash
- Mermaid

## Sources Consulted
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Molecule Docker custom image documentation: https://docs.ansible.com/projects/molecule/guides/custom-image/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions Python build and test documentation: https://docs.github.com/en/actions/tutorials/build-and-test-code/python
- Ansible built-in module index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Ansible release and maintenance documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- PEP 440 version specifier documentation: https://peps.python.org/pep-0440/

## Issues Found
- The custom environment variables in the dynamic Molecule examples used the `MOLECULE_` prefix (`MOLECULE_DISTRO`, `MOLECULE_IMAGE`, and `MOLECULE_COMMAND`). Current Molecule documentation reserves the `MOLECULE_` namespace for Molecule-defined variables. Renamed the custom variables to `TEST_DISTRO`, `TEST_IMAGE`, and `TEST_COMMAND`.
- The GitHub Actions snippet set the distro variable but did not source the lookup script before running Molecule, so the selected Docker image and init command would not be applied. Added `. scripts/set_molecule_vars.sh` before `molecule test`.
- The Makefile snippets set only the distro variable before invoking Molecule, so dynamic image and command selection would not happen locally. Updated the loop commands to export `TEST_DISTRO`, source `scripts/set_molecule_vars.sh`, and then run Molecule.

## Review Notes
- The Ansible versions used in the example matrix (`2.15`, `2.16`, and `2.17`) are now end-of-life according to current Ansible documentation as of 2026-05-26, but they are still valid as examples for testing older supported-role claims.
- The post uses Python `3.11` in GitHub Actions, which is compatible with the listed ansible-core versions based on the Ansible support matrix.
- The Molecule, GitHub Actions matrix, Ansible built-in module, pip compatible-release specifier, and Makefile examples are syntactically and technically valid after the corrections above.
