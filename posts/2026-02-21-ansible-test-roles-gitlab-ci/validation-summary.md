# Validation Summary: How to Test Ansible Roles with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker driver
- GitLab CI
- GitHub Actions
- ansible-lint
- yamllint
- pytest-testinfra
- Docker-in-Docker

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command-line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Ansible Molecule pre ansible-native verifier documentation: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule Docker/systemd container guide: https://docs.ansible.com/projects/molecule/guides/systemd-container/
- GitLab Docker-in-Docker CI documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- Ansible builtin collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- ansible-lint documentation: https://docs.ansible.com/projects/lint/
- Testinfra documentation: https://testinfra.readthedocs.io/

## Issues Found
- The installation commands used `molecule-docker`, but current Molecule documentation directs users to install non-default drivers from the `molecule-plugins` package. Changed Docker-driver installs to `molecule "molecule-plugins[docker]"`.
- The installation command used `testinfra`, but current Testinfra documentation installs the pytest plugin as `pytest-testinfra`. Updated the package name.
- The GitHub Actions matrix set `MOLECULE_DISTRO`, but the shown `molecule.yml` did not consume that environment variable. Changed the test command to pass the matrix value to Ansible through Molecule with `-- --limit`.
- The GitHub Actions matrix included `debian12`, but the shown Molecule platforms only define `ubuntu2404` and `rocky9`. Removed the undefined platform from the matrix.
- The GitLab CI Molecule job used `docker:latest` and then ran `pip install`, but the Docker CLI image is not a Python image. Changed the job to `python:3.11`, pinned the DinD service to `docker:24.0.5-dind`, and added the Docker host/TLS variables required for the TLS-disabled DinD pattern documented by GitLab.
- The infrastructure example used `ansible.builtin.timezone`, but the current timezone module is `community.general.timezone`, not part of `ansible-core`. Updated the FQCN.

## Review Notes
The Molecule systemd container example is structurally aligned with Molecule's guidance for service-oriented tests, but real projects should use images that include the role's runtime prerequisites such as Python and systemd support, or provide a `Dockerfile.j2`/prepare step to install them. The example services and paths (`my_service`, `/etc/my_service/config.yml`, and port `8080`) are placeholders that must match the role under test.
