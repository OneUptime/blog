# Validation Summary: How to Use the Ansible raw Module for Bootstrapping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.raw
- Ansible fact gathering
- Ansible privilege escalation
- Ansible network automation modules
- Docker container connections for Ansible
- Linux package managers: apt, dnf, yum, apk, zypper
- Python bootstrapping

## Sources Consulted
- Ansible `ansible.builtin.raw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible managed node requirements: https://docs.ansible.com/projects/ansible/8/installation_guide/intro_installation.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- Ansible `community.docker.docker` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html
- Ansible `ansible.netcommon.network_cli` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- Ansible `ansible.netcommon.cli_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_command_module.html
- Ansible `ansible.netcommon.cli_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_config_module.html

## Issues Found
- The introduction described `raw` as only sending commands over SSH. The official module documentation describes execution through the configured remote shell/connection, and the post also covers Docker and network connections, so the wording was corrected.
- The explanation said Ansible modules are Python scripts. Official documentation notes exceptions, including PowerShell and network modules, so this was narrowed to "many Ansible modules."
- The basic bootstrap playbook used the same `python_check.rc != 0` condition for both Debian/Ubuntu and RHEL/CentOS install tasks. If Python was missing, both tasks could run, causing the wrong package manager command to fail. This was replaced with a single detected-package-manager task.
- The complete bootstrap package-manager detection did not fail when no supported package manager was found and did not include `dnf`. It now handles `dnf` and exits with an error for unsupported package managers.
- The Python verification command in the complete bootstrap playbook was not valid YAML because of nested quotes and colons inside a plain scalar. It now uses a block scalar.
- The Docker connection example used `connection: docker`. Current official documentation says to specify `community.docker.docker`, so the example was updated.
- The network automation guidance referenced short module names such as `ios_config` and `nxos_config`. This was updated to current FQCN-style examples and platform-agnostic `ansible.netcommon` modules.
- The timeout example used `failed_when: update_result.rc == 124`, which would hide other command failures. It now fails on any non-zero return code while preserving the timeout note.

## Review Notes
All fenced YAML snippets were parsed successfully after the fixes. Ansible is not installed in the local environment, so module execution was not run locally; review was based on current official Ansible documentation and syntax validation.
