# Validation Summary: How to Use Ansible to Set Up Development Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles, tasks, variables, and playbook execution
- Ansible apt, include_tasks, blockinfile, get_url, unarchive, file, command, and shell usage
- community.general git_config and pipx modules
- community.docker docker_container module
- pipx-managed Python tooling
- NVM and Node.js
- Go toolchain installation and go install
- Dockerized PostgreSQL and Redis
- Git and shell configuration

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible community.general.git_config documentation: https://docs.ansible.com/ansible/latest/collections/community/general/git_config_module.html
- Ansible community.general.pipx documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/pipx_module.html
- Ansible community.docker.docker_container documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- NVM official README: https://github.com/nvm-sh/nvm
- Go official Linux installation documentation: https://go.dev/doc/install
- Go official go install guidance: https://go.dev/doc/go-get-install-deprecation

## Issues Found
- The Git configuration task used the short `git_config` module name. Updated it to `community.general.git_config` because current Ansible documentation places this module in the `community.general` collection.
- The Python tooling task used raw `pipx install` commands with `failed_when: false`, which could hide real installation failures. Replaced it with the documented `community.general.pipx` module and `state: present`.
- The main task list showed a separate `shell.yml` file but never included it, so the shell alias configuration would not run. Added `include_tasks: shell.yml`.
- The Node.js NVM task used a broad `creates` path that would prevent future `devenv_node_version` changes from being applied after any Node version had been installed. Removed that guard and added change detection based on NVM output.
- The Go installation task extracted a new archive over an existing `/usr/local/go` tree and used `creates: /usr/local/go/bin/go`, so version changes would not be applied. Added a current-version check and removal step before extraction when the installed Go version differs, matching Go's official Linux installation guidance.
- The Docker and community.general modules require collections that are not part of `ansible-core`. Added the required `ansible-galaxy collection install community.general community.docker` command before running the playbook.

## Review Notes
- The apt package names for versioned Python packages are distribution-dependent. The snippets are technically valid for systems whose apt repositories provide those package names, but teams may need distro-specific repositories or defaults.
- The NVM install URL in the post uses v0.39.7, which still exists, but the current NVM README shows a newer release. Pinning an older installer is acceptable for repeatability, but teams should periodically update it.
