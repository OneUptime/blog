# Validation Summary: How to Test Ansible Roles with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Docker driver
- GitHub Actions
- GitLab CI
- Docker-in-Docker
- ansible-lint
- yamllint
- pytest-testinfra

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- Ansible service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Testinfra documentation: https://testinfra.readthedocs.io/en/latest/
- GitHub Actions setup-python documentation: https://github.com/actions/setup-python
- GitHub Actions billing documentation: https://docs.github.com/actions/learn-github-actions/usage-limits-billing-and-administration
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- Local Docker inspection of the referenced Ubuntu, Rocky Linux, Debian, and geerlingguy Ansible test images.

## Issues Found
- The install commands used `molecule-docker`, but current Molecule documentation points users to `molecule-plugins[docker]` for the Docker driver. Updated the local, GitHub Actions, and GitLab CI install commands.
- The install command used `testinfra`, but current Testinfra documentation installs the package as `pytest-testinfra`. Updated the command.
- The opening claim described GitHub Actions as free CI/CD without qualification. Updated it to reflect GitHub's current public-repository free usage and private-repository quota model.
- The Molecule platform examples used base `ubuntu:24.04` and `rockylinux:9` images with systemd commands. Local Docker inspection showed these base images are not suitable for the shown systemd/Python Ansible scenario as written. Updated the examples to use Ansible test images with Python and systemd, and added the missing Debian 12 platform referenced by the CI matrix.
- The service facts assertion checked `my_service`, but systemd service facts commonly use unit names such as `my_service.service`. Updated the assertion to use the systemd unit key.
- The GitHub Actions matrix set `MOLECULE_DISTRO`, but the Molecule configuration did not consume that environment variable. Updated the workflow to pass the matrix value through Ansible's `--limit`.
- The GitLab CI job used `docker:latest` while running `pip install`, which is not a Python image, and omitted Docker-in-Docker connection variables. Updated the job to use a Python image with a pinned Docker-in-Docker service and the documented `DOCKER_HOST` / `DOCKER_TLS_CERTDIR` variables.
- The infrastructure workflow used `ansible.builtin.timezone`, but the current module FQCN is `community.general.timezone`. Updated the module reference.
- The error-handling example intended to report and fail after both primary and fallback commands failed, but the fallback command would stop the play immediately on failure. Added `failed_when: false` to allow the later status and fail tasks to run.

## Review Notes
- The post is technically relevant and code-focused.
- The snippets are examples and still assume the placeholder role creates `my_service.service`, `/etc/my_service/config.yml`, and a health endpoint on port 8080.
- Parsed all YAML snippets and compiled the Python snippet after the edits.
