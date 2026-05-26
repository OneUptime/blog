# Validation Summary: How to Use ServerSpec for Ansible Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Ansible community collections (`community.general`)
- Molecule scenarios and Docker-based test platforms
- Testinfra Python infrastructure tests
- GitHub Actions and GitLab CI
- YAML and shell commands

## Sources Consulted
- [Ansible Molecule installation documentation](https://docs.ansible.com/projects/molecule/installation/)
- [Ansible Molecule command line reference](https://docs.ansible.com/projects/molecule/usage/)
- [Ansible Molecule configuration documentation](https://docs.ansible.com/projects/molecule/configuration/)
- [Ansible Molecule Docker containers example](https://docs.ansible.com/projects/molecule/examples/docker/)
- [molecule-plugins package on PyPI](https://pypi.org/project/molecule-plugins/)
- [ansible.builtin.service_facts module documentation](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html)
- [community.general.timezone module documentation](https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html)
- [community.general.ufw module documentation](https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html)
- [ansible.builtin.cron module documentation](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html)
- [Testinfra modules documentation](https://testinfra.readthedocs.io/en/latest/modules.html)

## Issues Found
- The post title, tags, description, and opening paragraph claimed the article was about ServerSpec, Ruby, and RSpec, but the implementation examples were Molecule, Ansible verifier playbooks, and Testinfra. Updated the metadata and introduction to match the actual technical content.
- The setup and CI snippets installed `molecule-docker`, but current Molecule documentation directs users to driver plugins via `molecule-plugins`, and PyPI lists the `docker` extra. Updated installs to `molecule "molecule-plugins[docker]"`.
- The setup command used `ansible-core` while later examples use `community.general` modules. Changed the install command to `ansible` so the community package is available for those examples.
- The verification playbook checked `ansible_facts.services['my_service']`, but `service_facts` reports systemd services by unit name such as `my_service.service`. Updated the assertion to use `my_service.service`.
- The GitHub Actions matrix included `debian12` and set `MOLECULE_DISTRO`, but the Molecule configuration did not use that environment variable or define a Debian platform. Updated the matrix to the configured platforms and passed the platform through `--limit`.
- The GitLab CI Molecule job used `docker:latest`, which is not a Python image suitable for `pip install`. Changed it to `python:3.11` with Docker-in-Docker connection variables.
- The infrastructure example used `ansible.builtin.timezone`, but the timezone module is currently in `community.general`. Updated it to `community.general.timezone`.
- The SSH restart handler always used `sshd`, which is incorrect on Debian-family systems where the service is commonly `ssh`. Updated the handler to choose `ssh` on Debian-family hosts and `sshd` otherwise.
- Generic generated phrases referred to "this module" even though the article is about testing patterns, not a single Ansible module. Updated those phrases to avoid a misleading technical reference.

## Review Notes
- The Molecule Docker platform example still assumes containers suitable for service management. In real projects, Ansible-ready systemd images or explicit create/destroy playbooks are often more reliable than minimal base distribution images.
- The Testinfra examples use documented `host.service`, `host.file`, and `host.socket` APIs and are syntactically correct for pytest-style Testinfra tests.
