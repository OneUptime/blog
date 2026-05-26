# Validation Summary: How to Write Clean YAML for Ansible Playbooks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- YAML
- ansible-lint
- Ansible built-in modules
- community.general collection modules

## Sources Consulted
- Ansible YAML syntax documentation: https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html
- ansible-lint FQCN rule: https://docs.ansible.com/projects/lint/rules/fqcn/
- ansible-lint name rule: https://docs.ansible.com/projects/lint/rules/name/
- ansible-lint YAML rule: https://docs.ansible.com/projects/lint/rules/yaml/
- ansible-lint installation documentation: https://docs.ansible.com/projects/lint/installing/
- Ansible conditionals documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- community.general.timezone module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- YAML 1.1 boolean type documentation: https://yaml.org/type/bool.html

## Issues Found
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current documented FQCN for the timezone module is `community.general.timezone`. Updated the example to use `community.general.timezone`.
- The "Common Use Cases" introduction and two code comments referred to "this module", but the post discusses YAML conventions rather than a single Ansible module. Updated those references to "these conventions" to avoid an inaccurate technical framing.

## Review Notes
All YAML code blocks parse successfully as YAML. The examples use current FQCN guidance, named tasks, quoted file modes, valid `when` list syntax, and documented parameters for the checked Ansible modules. The system administration examples are illustrative and may still need environment-specific adjustments such as installed collections, service names, users, and target OS package availability.
