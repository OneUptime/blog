# Validation Summary: How to Parse JSON Data in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible filters: from_json, to_json, to_nice_json, community.general.json_query
- Ansible modules and plugins: uri, include_vars, file lookup, shell, copy, debug, set_fact
- JSON and JMESPath
- Terraform CLI JSON output

## Sources Consulted
- Ansible ansible.builtin.from_json filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/from_json_filter.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible ansible.builtin.file lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible ansible.builtin.to_json filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_json_filter.html
- Ansible ansible.builtin.to_nice_json filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_nice_json_filter.html
- Ansible playbook filter guide for community.general.json_query and JMESPath dependency: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible blocks and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Terraform show command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format

## Issues Found
- The post referred to `json_query` as though it were directly available in current Ansible core examples. Current Ansible documentation says the JSON query filter has migrated to the `community.general` collection and requires the `jmespath` Python library on the controller. Updated the relevant description, examples, diagram label, Terraform state example, and summary to use `community.general.json_query` and mention the dependency.

## Review Notes
- `ansible-playbook` and `terraform` were not installed in the local environment, so examples were reviewed against official documentation rather than executed end to end.
- The `uri` module behavior described in the post is correct: Ansible loads a JSON response into the registered result's `json` key when the reported Content-Type is `application/json`.
