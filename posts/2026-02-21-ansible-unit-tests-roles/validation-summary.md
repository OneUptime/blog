# Validation Summary: How to Implement Unit Tests for Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible and ansible-core
- Ansible roles, playbooks, facts, and built-in modules
- Molecule
- Molecule Docker driver
- ansible-lint and yamllint
- pytest and Testinfra
- GitHub Actions
- GitLab CI
- community.general Ansible collection

## Sources Consulted
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule CI documentation: https://docs.ansible.com/projects/molecule/ci/
- ansible.builtin.service_facts documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- ansible.builtin.stat documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- ansible.builtin.wait_for documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.uri documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.hostname documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.cron documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- community.general.timezone documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Testinfra module documentation: https://testinfra.readthedocs.io/en/latest/modules.html

## Issues Found
- The setup and CI examples installed the older standalone `molecule-docker` package. Updated them to install `"molecule-plugins[docker]"`, which is the current Molecule packaging documented for non-default drivers.
- The setup and CI examples used `ansible-core` but later examples referenced `community.general` modules. Added `ansible-galaxy collection install community.general` so `community.general.ufw` and `community.general.timezone` resolve correctly.
- The Molecule Docker platforms used plain `ubuntu:24.04` and `rockylinux:9` images while running systemd-oriented service tests. Updated the examples to use Ansible testing images intended for role testing and added `cgroupns_mode: host` for systemd container support.
- The `service_facts` assertions checked for `my_service`, but systemd service facts are commonly keyed with the unit name, such as `my_service.service`. Updated the assertions to use `my_service.service`.
- The GitHub Actions matrix included `debian12` and set `MOLECULE_DISTRO`, but the shown Molecule config never consumed that environment variable. Updated the matrix to match the configured platforms and pass the platform through Ansible's `--limit` option.
- The GitLab CI Molecule job used `docker:latest` and then ran `pip` without installing or isolating Python tooling. Added the required Alpine packages and a virtual environment before installing Molecule.
- The infrastructure example used `ansible.builtin.timezone`, but current documentation provides the timezone module as `community.general.timezone`. Updated the module FQCN.

## Review Notes
The post's examples are role-testing examples using Molecule. They validate role behavior in isolated scenarios, but they are closer to role/integration tests than pure unit tests in the strict software-testing sense.
