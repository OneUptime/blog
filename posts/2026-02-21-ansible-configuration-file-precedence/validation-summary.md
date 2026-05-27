# Validation Summary: How to Set Up Ansible Configuration File Precedence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.cfg configuration files
- Ansible environment variables
- ansible-config CLI
- SSH connection configuration
- Makefile command wrappers

## Sources Consulted
- Ansible Configuration Settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible precedence rules: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/general_precedence.html
- ansible-config CLI reference: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-config.html
- ansible.builtin.ssh connection plugin reference: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html

## Issues Found
- The post said `/etc/ansible/ansible.cfg` is created automatically when Ansible is installed from a package manager. This is not universally true, so I changed it to say some OS package installations include it and Ansible can run without it.
- The project-level example used `callback_whitelist`, an older configuration key. I changed it to the current `callbacks_enabled` key.
- The post said every individual Ansible setting can be overridden by an environment variable. Official docs say many settings have environment variables, not all settings, so I narrowed the claim.
- The post described environment variable names as a direct `ANSIBLE_` plus uppercase setting-name conversion. This is often true but not universal, so I added examples and directed readers to `ansible-config list` or the configuration reference.
- The post implied `ansible-config dump --only-changed -v` is what shows the source of each value. The `ansible-config dump` output itself is the relevant source/value inspection command, while `-v` increases verbosity, so I corrected that wording.

## Review Notes
The core configuration file precedence order is correct: `ANSIBLE_CONFIG`, current-directory `ansible.cfg`, `~/.ansible.cfg`, then `/etc/ansible/ansible.cfg`, with the first file found being used and later files ignored. Environment variables also correctly override settings from the active configuration file.
