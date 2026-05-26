# Validation Summary: How to Configure ansible-navigator Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- ansible-navigator
- Ansible execution environments
- YAML configuration
- Container engines such as Podman and Docker

## Sources Consulted
- ansible-navigator settings documentation: https://docs.ansible.com/projects/navigator/settings/
- ansible-navigator FAQ: https://docs.ansible.com/projects/navigator/faq/
- ansible-navigator subcommands documentation: https://docs.ansible.com/projects/navigator/subcommands/
- Ansible Core callback plugins documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Development Tools execution environment documentation: https://docs.ansible.com/projects/dev-tools/container/

## Issues Found
- The configuration file location section only mentioned `.yml` files. Updated it to include supported `.yaml` project and home files as documented by ansible-navigator.
- The location precedence explanation implied project and home settings could be layered as overrides. Clarified that project-specific config files take precedence over the home config.
- The post claimed to cover every configuration option and labeled one example as every option documented, but the example covered common options only. Adjusted the wording to avoid overclaiming.
- Inventory examples used a non-existent top-level `inventories` key. Updated them to the documented `ansible.inventory.entries` path.
- The `playbook-artifact.replay` setting was described as a boolean for replaying on completion. Updated it to a replay artifact path, matching the replay subcommand setting.
- Two partial configuration snippets omitted the required `ansible-navigator` root key. Updated them so they are valid ansible-navigator settings snippets.
- Replaced deprecated-style `ANSIBLE_CALLBACK_WHITELIST` usage with `ANSIBLE_CALLBACKS_ENABLED`, matching current Ansible callback documentation.
- The verification command and explanation implied sources were always shown. Updated the command to use `--effective --sources` and clarified that the settings view can show source information.

## Review Notes
The local environment did not have `ansible-navigator` installed, so CLI behavior was verified against official documentation rather than local `--help` output. YAML snippets were parsed successfully after edits.
