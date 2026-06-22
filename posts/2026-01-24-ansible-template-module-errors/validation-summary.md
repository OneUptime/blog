# Validation Summary: How to Fix 'Template Module' Rendering Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible
- ansible.builtin.template
- Jinja2 templates
- Ansible filters, tests, lookups, and variables
- YAML playbooks
- Nginx configuration validation commands

## Sources Consulted
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible filters documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible ansible.builtin.to_nice_yaml filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/to_nice_yaml_filter.html
- Ansible ansible.builtin.first_found lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible search paths documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Jinja Template Designer documentation: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The filter-not-found example used `to_yaml` as the missing filter, but `to_yaml` and `to_nice_yaml` are built into ansible-core. Changed the missing filter example to `custom_format` and added a note that the YAML filters are built in.
- The filter section described `join`, `lower`, `upper`, and `replace` as Python methods. Changed the label to built-in Jinja filters.
- The encoding section implied `output_encoding` could fix source template decoding. Ansible requires source templates to be UTF-8, while `output_encoding` only controls the rendered destination encoding. Updated the wording and example accordingly.
- The encoding section suggested adding a coding declaration inside a Jinja comment. Removed it because Ansible still requires the template source file itself to be UTF-8 encoded.
- The recursive include guard checked `depth` but did not increment it before including the recursive partial. Added `depth = depth + 1`.
- The template path section claimed variable interpolation in `src` was the problem. Ansible templates module arguments are templated; the real issue is usually the search path. Updated the wording to explain the incorrect `templates/` prefix in role contexts.
- The dictionary/list section suggested `default(omit)` for file content. `omit` is intended for optional module parameters, not literal rendered output. Replaced that example with a note.
- The separate Nginx validation example rendered directly to `/etc/nginx/nginx.conf` before validating, which defeats validation as a safety step. Changed it to render a candidate file, validate that candidate, and copy it into place only after successful validation.
- The validation playbook defined sample variables under `test_variables`, but the templates referenced variables such as `app_name` directly. Moved those variables to the play vars scope used by the template task.

## Review Notes
Ansible was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `ansible-playbook`.
