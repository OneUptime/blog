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
- Docker-in-Docker
- community.general Ansible collection

## Sources Consulted
- Ansible Molecule documentation: https://docs.ansible.com/projects/molecule/
- Ansible Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Ansible Molecule command-line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Molecule pre ansible-native configuration reference: https://docs.ansible.com/projects/molecule/pre-ansible-native/
- Ansible Molecule systemd container guide: https://docs.ansible.com/projects/molecule/guides/systemd-container/
- Ansible Molecule continuous integration guide: https://docs.ansible.com/projects/molecule/ci/
- ansible.builtin.service_facts documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- ansible.builtin.stat documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- ansible.builtin.wait_for documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.uri documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.setup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/setup_module.html
- ansible.builtin.hostname documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.cron documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- community.general.timezone documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Testinfra modules documentation: https://testinfra.readthedocs.io/en/latest/modules.html
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/

## Issues Found
- The install commands used the older `molecule-docker` package. Updated them to the current Molecule plugin package form, `"molecule-plugins[docker]"`, matching Molecule's current installation and CI documentation.
- The setup used `ansible-core` but later examples used modules from `community.general`. Added `ansible-galaxy collection install community.general` where needed.
- The Molecule Docker platforms used minimal base OS images with systemd commands. Those images are not suitable as-is for Ansible role tests because they lack the expected Ansible target environment. Updated the examples to use Python/systemd-capable Molecule target images and added `cgroupns_mode: host`.
- The service facts assertion checked `my_service` as a key. For systemd services, `service_facts` commonly exposes names with the `.service` suffix. Updated the example to assert `my_service.service`.
- The GitHub Actions matrix included `debian12` even though the Molecule scenario only defined Ubuntu and Rocky platforms, and the matrix variable was not used. Updated the matrix and test command to pass `--limit` for the selected platform.
- The GitLab CI job used `docker:latest` and then ran `pip` without installing Python/pip. Added Python, pip, virtualenv, and build dependencies before installing Molecule tooling.
- The infrastructure example used `ansible.builtin.timezone`, but timezone is provided by the `community.general` collection in current Ansible documentation. Updated it to `community.general.timezone`.

## Review Notes
The post's examples are role-testing examples using Molecule. They validate role behavior in isolated scenarios, but they are closer to role/integration tests than pure unit tests in the strict software-testing sense. The examples remain illustrative: real roles must replace placeholder service names, ports, paths, package lists, and monitoring URLs with values that match the role under test.
