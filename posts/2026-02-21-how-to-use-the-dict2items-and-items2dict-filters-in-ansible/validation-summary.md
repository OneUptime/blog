# Validation Summary: How to Use the dict2items and items2dict Filters in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible/Jinja2 filters
- YAML playbooks
- Docker labels
- Docker Compose labels

## Sources Consulted
- Ansible `ansible.builtin.dict2items` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible `ansible.builtin.items2dict` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/items2dict_filter.html
- Ansible playbook guide, filters and `dict(keys_list | zip(values_list))`: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Docker `docker container run` label option documentation: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose service `labels` documentation: https://docs.docker.com/reference/compose-file/services/#labels

## Issues Found
- The introduction said `dict2items` and `items2dict` are "perfect inverses." This was too absolute because `items2dict` collapses duplicate item keys and both filters depend on the expected or configured key/value field names. Updated the wording to describe round-tripping with unique keys and expected field names.
- The Docker label debug example applied `regex_replace` to whole item dictionaries, producing strings such as `--label {'key': 'app', 'value': 'frontend'}` instead of Docker's `--label key=value` form. Replaced it with a `dict2items` loop that emits `--label {{ item.key }}={{ item.value }}`.
- The key prefix example used `map('combine', {'key': 'APP_' + item.key})`, but `item` is undefined in that filter argument. Replaced it with a `dict2items` plus `dict(... | zip(...))` expression that prefixes keys and preserves values.
- The parallel-list example used a non-existent `items2dict_pair` filter. Replaced it with Ansible's documented `dict(keys | zip(values))` pattern.

## Review Notes
The main `dict2items`, `items2dict`, custom `key_name`/`value_name`, filtering, `uri`, `lineinfile`, template, and Docker Compose label examples are consistent with the official documentation. The temporary execution checks used `ansible-core` installed under `/tmp` because Ansible was not available in the workspace image.
