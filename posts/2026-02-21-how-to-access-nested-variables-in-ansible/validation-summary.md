# Validation Summary: How to Access Nested Variables in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible variables and facts
- Jinja2 templating and filters
- `ansible.builtin.uri`
- `community.general.json_query` / JMESPath

## Sources Consulted
- Ansible documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible documentation: Discovering variables: facts and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: Using filters to manipulate data - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible documentation: `ansible.builtin.uri` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Jinja documentation: Template designer documentation - https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The "Ansible-Specific ternary Pattern" heading described a Jinja conditional expression, not Ansible's `ternary` filter. Updated the heading to identify the syntax accurately.
- The `set_fact` fallback example used a folded Jinja block that would include extra whitespace around the resulting value. Replaced it with an inline conditional expression so `cache_host` is set exactly to the selected hostname.
- The `subelements('env_vars | dict2items')` example was invalid because `subelements` expects a subelement key/path and does not evaluate a filter expression. Replaced it with a valid loop over `applications` that converts each `env_vars` dictionary with `dict2items`.
- The nginx template checked `app.env_vars.get('CORS_ORIGIN') is defined`, but `dict.get()` returns `None` for a missing key and `None` is still defined in Jinja. Changed the condition to test key membership with `'CORS_ORIGIN' in app.env_vars`.
- The URI response examples used `pods_response.json.items`, which can collide with the dictionary `items()` method. Changed access to `pods_response.json['items']`, matching Ansible's guidance to use bracket notation for dictionary keys that collide with Python dictionary attributes or methods.
- A comment referenced `with_items` even though the task used `loop`. Updated the comment to describe the actual approach.

## Review Notes
The examples assume modern Ansible behavior, including nested `default` support introduced in Ansible 2.8 and the `community.general.json_query` filter being available with the `jmespath` Python dependency installed on the control node.
