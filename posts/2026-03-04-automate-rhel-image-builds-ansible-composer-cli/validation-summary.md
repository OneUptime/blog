# Validation Summary: How to Automate RHEL Image Builds with Ansible and composer-cli

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL Image Builder
- composer-cli
- Ansible playbooks
- Bash scripting
- CI/CD automation

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Creating system images by using RHEL image builder CLI - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-system-images-with-composer-command-line-interface_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 8 documentation: RHEL image builder output formats - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/composer-description_composing-a-customized-rhel-system-image
- Ansible documentation: ansible.builtin.command module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible Core documentation: ansible.builtin.regex_search filter - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/regex_search_filter.html

## Issues Found
- The Ansible playbook allowed `blueprint_name` to be overridden, but the copy and push tasks still hard-coded `blueprints/web-server.toml` and `/tmp/web-server.toml`. Updated those paths to use `{{ blueprint_name }}` so the documented `database-server` override works as intended.

## Review Notes
The `composer-cli` workflow and commands shown in the post match Red Hat's documented Image Builder CLI flow. The sample uses `compose info` for polling instead of the documented `compose status`; this is still consistent with the documented `compose info <COMPOSE-UUID>` command and the post checks for the documented `FINISHED` status value.
