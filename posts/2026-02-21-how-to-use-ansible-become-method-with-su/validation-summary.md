# Validation Summary: How to Use Ansible become_method with su

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation
- Ansible `su` become plugin
- Ansible Vault
- Ansible inventory and playbook configuration
- Linux `su`, `sudo`, and package management

## Sources Consulted
- Ansible `ansible.builtin.su` become plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/su_become.html
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.dnf` / `yum` package module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible inventory documentation: https://docs.ansible.com/ansible/latest/user_guide/intro_inventory.html

## Issues Found
- The post stated that `sudo` requires the current user's password. Updated this to say `sudo` usually requires the current user's password, because sudo policy can be configured differently.
- The post stated that Ansible `su` starts a login shell by default. Updated this because the Ansible `su` become plugin has empty default `become_flags`; login-shell behavior requires a flag such as `become_flags: '-'`.
- The non-root user example used `ansible.builtin.command` with shell redirection (`>`). Changed it to `ansible.builtin.shell`, because the `command` module does not process shell metacharacters.
- The post claimed Ansible's default `su` behavior is to escalate to root and then switch to the requested user. Replaced this with the correct single-method behavior, since Ansible documents that become methods cannot be chained.
- The localized `su` prompt examples included trailing colons. Removed the colons because Ansible's `ansible_su_prompt_l10n` documentation says custom entries must not include `:`.

## Review Notes
Ansible CLI tools were not installed in the local environment, so command help could not be checked locally. The review was completed against current official Ansible documentation.
