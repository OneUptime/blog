# Validation Summary: How to Set Up Continuous Testing for Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible and Ansible playbooks
- Ansible roles and collections
- Molecule
- molecule-docker
- ansible-lint
- yamllint
- pytest-testinfra
- GitHub Actions
- GitLab CI with Docker-in-Docker

## Sources Consulted
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule Docker image guide: https://ansible.readthedocs.io/projects/molecule/guides/custom-image/
- Ansible service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Testinfra documentation: https://testinfra.readthedocs.io/
- yamllint quickstart documentation: https://yamllint.readthedocs.io/en/latest/quickstart.html
- GitLab Docker-in-Docker CI documentation: https://docs.gitlab.com/ci/docker/using_docker_build/

## Issues Found
- The setup command installed `testinfra`, but the current Testinfra documentation uses the `pytest-testinfra` package. Changed the install command to use `pytest-testinfra`.
- The setup command installed `ansible-core`, while later examples use `community.general` modules. Changed it to install the `ansible` package so the bundled community collections are available for the examples.
- The GitHub Actions matrix set `MOLECULE_DISTRO` but the shown `molecule.yml` did not consume that environment variable, and the matrix included `debian12` even though the scenario defined only `ubuntu2404` and `rocky9`. Changed the Molecule command to pass `--limit` with the matrix value.
- The GitLab CI Molecule job used `docker:latest` and then ran `pip`, but the Docker CLI image does not provide a Python/pip environment suitable for that command. Changed it to a pinned Docker CLI image, added a matching Docker-in-Docker service, configured the standard Docker daemon variables, and created a Python virtual environment before installing Molecule.
- The timezone task used `ansible.builtin.timezone`, which is not present in current Ansible documentation. Changed it to `community.general.timezone`.
- The SSH restart handler always used `sshd`, which fails on Debian-family hosts where the service is commonly named `ssh`. Changed the handler to select `ssh` for Debian-family systems and `sshd` otherwise.
- Several "Common Use Cases" lines referred to "this module", but the post is about continuous testing rather than an Ansible module. Updated those phrases to refer to continuous testing.

## Review Notes
The Molecule example uses the pre ansible-native configuration style, which remains documented for compatibility. Future updates could consider an ansible-native Molecule example, but the existing configuration is still valid.
