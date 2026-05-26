# Validation Summary: How to Mock External Services in Ansible Testing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible built-in modules
- community.general Ansible collection
- Molecule
- Molecule Docker driver
- ansible-lint
- yamllint
- pytest-testinfra
- GitHub Actions
- GitLab CI with Docker-in-Docker

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- ansible.builtin.service_facts documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- ansible.builtin.uri documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- community.general.timezone documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- pytest-testinfra socket and service module documentation: https://testinfra.readthedocs.io/en/latest/modules.html

## Issues Found
- The setup and CI snippets installed `molecule-docker`, but current Molecule documentation points users to the `molecule-plugins` package for Docker driver support. Updated the installation commands to use `"molecule-plugins[docker]"`.
- The local setup command installed `ansible-core`, but later examples use `community.general` modules. Updated the setup command to install the full `ansible` package and added an `ansible-galaxy collection install community.general` command.
- The GitHub Actions matrix listed `debian12`, but the Molecule configuration only defined `ubuntu2404` and `rocky9`. Removed `debian12` from the matrix.
- The GitHub Actions workflow set `MOLECULE_DISTRO`, but the shown `molecule.yml` did not use that environment variable. Removed the unused environment variable and used the same Ansible host limit shown in the running commands section.
- The GitLab CI Molecule job used `docker:latest` and then called `pip`, which is not a reliable Python environment. Updated it to follow Molecule's Docker-in-Docker CI pattern with `docker:stable-dind`, Alpine package installation, and `python3 -m pip`.
- The infrastructure example used `ansible.builtin.timezone`, which is not an ansible-core module. Changed it to `community.general.timezone`.
- The SSH restart handler used `sshd` for all distributions, which fails on Debian-family systems such as Ubuntu where the service is commonly named `ssh`. Changed the handler to choose `ssh` on Debian-family systems and `sshd` elsewhere.

## Review Notes
The post title and description promise mocking external services, but the body mostly covers general Ansible and Molecule testing rather than service mocks. The examples are syntactically valid after correction, but they are still illustrative and depend on a sample `my_role`, a `my_service` service, Docker availability, and CI runners configured for Docker-in-Docker.
