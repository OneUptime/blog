# Validation Summary: How to Pass Variables to Roles in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible roles
- Ansible variables and variable precedence
- Ansible inventory variables
- Ansible Vault
- Ansible CLI extra vars

## Sources Consulted
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- ansible.builtin.set_fact module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- community.general.json_query filter documentation: https://docs.ansible.com/ansible/latest/collections/community/general/json_query_filter.html

## Issues Found
- The role-parameter examples used `vars:` under the `roles:` entry while describing role parameters. Updated the examples to use direct role parameters so they match Ansible's documented role parameter syntax.
- The post said only extra vars can override role parameters. Updated this to note that include params and extra vars have higher precedence, with extra vars highest overall.
- The variable precedence diagram placed role params below task vars and `set_fact` / registered vars. Updated the simplified diagram to match Ansible's documented precedence order more closely.
- The `set_fact` example used `json_query`, which is now provided by the `community.general` collection and requires `jmespath`. Replaced it with direct access to the parsed JSON object's `version` field so the example works with core filters.

## Review Notes
The precedence diagram is still intentionally simplified and omits some less relevant variable sources, but the relative ordering for the sources discussed in the post is now accurate. Local CLI verification was not possible because `ansible-playbook` is not installed in this environment.
