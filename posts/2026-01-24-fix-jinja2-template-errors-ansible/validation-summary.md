# Validation Summary: How to Fix 'Jinja2 Template' Errors in Ansible

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible
- Jinja2
- YAML
- Ansible playbooks
- Ansible template module
- Ansible debug module
- Ansible filters and tests

## Sources Consulted
- Ansible documentation: Templating (Jinja2): https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating.html
- Ansible documentation: Using filters to manipulate data: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible documentation: Using variables, including YAML quoting guidance: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible documentation: ansible.builtin.template module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible documentation: ansible.builtin.template lookup: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_lookup.html
- Jinja documentation: Template Designer Documentation: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The YAML quoting section showed the same quoted `shell: "{{ command }}"` example as both bad and good. Changed the bad example to the unquoted form and clarified that quoting the whole expression is the fix.
- The same YAML section described a folded scalar as "explicit full quoting." Changed the label to describe it as an alternative for longer commands.
- The ad-hoc `ansible` command used the `ipaddr` filter, which is not a core Jinja filter and may require an additional Ansible collection. Replaced it with the built-in Jinja `upper` filter so the example is portable.
- The `int` filter comment said conversion fails if the value is not a number. Jinja's `int` filter returns `0` by default on failed conversion unless a different default is supplied. Updated the comment accordingly.
- The complete testing example used `check_mode: yes` for the `template` task and then validated `/tmp/nginx.conf.test`. Since Ansible's template module supports check mode by predicting changes without modifying the target, the validation command could run against a missing or stale file. Removed check mode and the conditional so the rendered file is written before `nginx -t` validates it.

## Review Notes
Ansible was not installed in the local workspace, so command behavior was checked against official documentation rather than local CLI output. The remaining examples are general-purpose and technically valid, but some filters may behave differently across older Ansible/Jinja versions or with non-default undefined-variable settings.
