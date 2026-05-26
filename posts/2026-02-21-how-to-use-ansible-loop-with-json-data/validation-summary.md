# Validation Summary: How to Use Ansible loop with JSON Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loops
- JSON parsing with `from_json`
- `ansible.builtin.uri`
- `community.general.json_query` and JMESPath
- `dict2items`, `selectattr`, and `subelements` filters
- `community.general.ufw`
- Docker CLI JSON output

## Sources Consulted
- Ansible `ansible.builtin.from_json` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/from_json_filter.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible playbook blocks and `rescue` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible `community.general.json_query` filter documentation: https://docs.ansible.com/ansible/latest/collections/community/general/json_query_filter.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.subelements` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Ansible variable notation guidance: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `ansible.builtin.dict2items` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible `ansible.builtin.selectattr` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- `community.general.ufw` module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The Docker example used `ansible.builtin.command` with `$(docker ps -q)`. The command module does not process shell metacharacters or command substitution, so this would not run as written. Changed it to `ansible.builtin.shell`.
- The `json_query` section used the unqualified `json_query` filter without noting its current collection and dependency requirements. Updated the text and examples to use `community.general.json_query` and added the `community.general` collection and `jmespath` requirement.
- The JSON validation example placed `rescue` under a normal task. In Ansible, `rescue` belongs to a `block`. Reworked the parse step into a valid `block` with `rescue`.
- The validation example accessed a JSON key named `items` with dot notation. Because `items` collides with a Python dictionary method, changed those references to bracket notation: `parsed_data['items']`.

## Review Notes
The local environment did not have `ansible` or `ansible-doc` installed, so verification was performed against official Ansible documentation rather than by executing the playbooks locally.
