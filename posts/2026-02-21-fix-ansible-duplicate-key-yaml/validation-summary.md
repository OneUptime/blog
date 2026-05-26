# Validation Summary: How to Fix Ansible Duplicate Key YAML Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible
- YAML
- yamllint
- Ansible playbooks and configuration

## Sources Consulted
- YAML 1.2 specification: https://yaml.org/spec/1.2.0/
- Ansible configuration settings, `DUPLICATE_YAML_DICT_KEY`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible handlers guide: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible error handling guide: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/v1.31.0/configuration.html
- yamllint `key-duplicates` rule documentation: https://yamllint.readthedocs.io/
- `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- Duplicate handler names were presented as a YAML duplicate-key example. Handler names are values inside separate list items, so they are not duplicate mapping keys. They are still an Ansible problem because duplicate handler names can shadow earlier handlers. Updated the section heading and wording to describe it as a related Ansible issue rather than a YAML duplicate-key syntax error.
- The common-use-cases introduction referred to "this module," but the post discusses YAML validation and duplicate keys, not a module. Updated those references to YAML validation.
- The infrastructure example used `ansible.builtin.timezone`, which is not the current documented FQCN. Updated it to `community.general.timezone`.
- The fallback error-handling example registered `fallback_result` but would stop on fallback failure before the final report and explicit fail task ran. Added `failed_when: false` to the fallback command so the later failure logic can evaluate both results.

## Review Notes
The Ansible `duplicate_dict_key` setting was verified as available in `[defaults]` with `error`, `warn`, and `ignore` choices. Current Ansible defaults to warning on duplicate YAML dictionary keys, while `duplicate_dict_key = error` makes duplicates fatal.
