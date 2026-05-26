# Validation Summary: How to Optimize Ansible Template Rendering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.template module
- ansible.builtin.copy module
- ansible.builtin.set_fact module
- Ansible lookup plugins
- Ansible callback plugins
- Jinja2 templates, filters, includes, macros, and assignments

## Sources Consulted
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible set_fact module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible run_once strategy documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible configuration settings for ANSIBLE_CALLBACKS_ENABLED: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible filter documentation for extract/map examples: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Jinja template documentation for assignments, includes, macros, and join: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The string-concatenation example used `{% set server_list = ... %}` inside a loop and then read `server_list` outside the loop. Jinja assignments inside loops do not propagate to the outer scope, so the example would render an empty value. Changed it to use a Jinja `namespace` object, which is the documented way to propagate changes across loop scopes.
- The profile callback command used `ANSIBLE_CALLBACKS_ENABLED=profile_tasks`. The current official callback documentation identifies the callback as `ansible.posix.profile_tasks`, so the command was updated to use the fully qualified callback name.
- The post stated that `set_fact` with `run_once` runs once without qualification. Official Ansible strategy documentation notes that `run_once` runs once per current play batch, especially relevant when `serial` is used. Updated the wording to say "once for the current play batch."
- The post stated that each Jinja include requires loading and parsing another file and that consolidating templates saves file I/O. Jinja documents include as rendering another template, and caching can make the parsing/I/O details implementation-dependent. Updated the wording to focus on rendering overhead.
- The nested conditional section claimed the flattened version is faster because it avoids condition checks when outer conditions are false. Nested conditionals already avoid evaluating inner blocks when outer tests fail, so the claim was too strong. Updated the wording to focus on readability and avoiding repeated checks as templates grow.

## Review Notes
- The Ansible examples use short module names such as `template`, `copy`, and `set_fact`. These are still valid for built-in modules, though the official documentation recommends fully qualified collection names for documentation clarity and avoiding name conflicts.
- The `ansible.posix.profile_tasks` callback is part of the `ansible.posix` collection, not ansible-core. Environments that install only ansible-core may need to install that collection before using the profiling command.
