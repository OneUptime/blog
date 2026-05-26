# Validation Summary: How to Use YAML Tags in Ansible

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- Ansible Vault
- YAML
- Jinja2 templating in Ansible
- yamllint
- community.general Ansible collection

## Sources Consulted
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible advanced playbook syntax for `!unsafe`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_advanced_syntax.html
- Ansible YAML syntax reference: https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html
- Ansible lint `risky-octal` rule: https://docs.ansible.com/projects/lint/rules/risky-octal/
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- YAML 1.2.2 specification: https://spec.yaml.io/main/spec/1.2.2/

## Issues Found
- The `!unsafe` section described the tag as part of "Jinja2" rather than Ansible's unsafe data type. Changed the heading and wording to make it clear that `!unsafe` is an Ansible YAML tag used to prevent templating.
- The yamllint section claimed the shown `truthy` configuration allowed Ansible custom tags. yamllint does not provide a custom-tag allowlist option, and the `truthy` rule only controls boolean-like scalar values. Updated the explanation while keeping the relevant `truthy` example.
- The common use cases section referred to "this module", but YAML tags are not an Ansible module. Reworded the sentence and example comment to refer to YAML value handling instead.
- The infrastructure example used `ansible.builtin.timezone`, but the timezone module is currently documented as `community.general.timezone`. Updated the FQCN.

## Review Notes
The broad Ansible workflow examples are syntactically plausible, but several are generic operational examples rather than direct YAML tag examples. They were left in place because the task requested technical corrections only, not restructuring.
