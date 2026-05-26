# Validation Summary: How to Fix Ansible Variable is not defined in Loops

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible loops and loop_control
- Ansible include_tasks
- Ansible registered variables and set_fact
- Jinja2 default filter
- Ansible dict2items filter
- Ansible modules: debug, setup, package, timezone, hostname, lineinfile, service, uri, command, fail, copy, cron, community.general.ufw

## Sources Consulted
- Ansible loops documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible filters documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- ansible.builtin.set_fact module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- ansible.builtin.include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The Fix 1 and Fix 5 YAML snippets mixed top-level `vars:` mappings with top-level task list items, which is not valid YAML as written. Changed them to valid playbook fragments with `vars:` and `tasks:` keys.
- The Fix 3 explanation said variables registered in one `include_tasks` might not be available in the next. Official Ansible documentation says registered variables are available later for the same host during the current playbook run, so the example was corrected to describe task-level variables instead.
- The Fix 4 corrected example only showed a replacement `when:` line after the earlier task, which could be read as duplicate YAML keys in one task. Repeated the task in the fixed example so it stands alone.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the module name.

## Review Notes
- `community.general.timezone` and `community.general.ufw` are not part of `ansible-core`; they require the `community.general` collection unless the broader `ansible` package already includes it.
- Short module names such as `debug`, `set_fact`, and `include_tasks` remain valid for builtin modules, though Ansible documentation recommends FQCNs for linkability and avoiding collection conflicts.
- `ansible-playbook` is not installed in this environment, so full Ansible syntax-check execution was not available. YAML snippets were parsed with PyYAML, and module/behavior checks were verified against official documentation.
