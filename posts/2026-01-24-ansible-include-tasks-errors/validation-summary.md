# Validation Summary: How to Fix 'Include Tasks' Import Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible
- ansible.builtin.include_tasks
- ansible.builtin.import_tasks
- Ansible handlers
- Ansible tags
- Ansible playbook conditionals, blocks, variables, and CLI verification commands

## Sources Consulted
- Ansible include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible import_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_tasks_module.html
- Ansible "Reusing Ansible artifacts" playbook guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse.html
- Ansible handlers guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible tags guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible conditionals guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible blocks guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible playbooks introduction and verification guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html

## Issues Found
- The import-vs-include diagram incorrectly said `import_tasks` cannot use `when` with task variables. Ansible supports conditionals on imports, but applies them to the imported tasks. Updated the diagram to say that `when` applies to imported tasks and that import path variables are resolved early.
- The "Variable Undefined in Included File" example set `app_name` with `set_fact` before `include_tasks`, which would make the variable available to the included tasks. Removed the preceding `set_fact` from the broken example so the undefined-variable error is accurate.
- The same-directory include path example used `ansible_parent_role_paths`, which is for parent role paths and is not the right example for a sibling task file. Replaced it with a simple `include_tasks: common.yml` sibling include.
- The runtime conditional import example used a registered variable only in `when`, but import conditionals are inherited by imported tasks and evaluated at task execution time. Changed the example so the imported file path depends on a variable created by an earlier task, which accurately demonstrates the static import limitation.
- The handler section implied that `include_tasks` itself fails in handlers. Ansible supports dynamic handler includes, but you must notify the include/listener rather than a handler defined inside the dynamic include. Updated the problem, error, and fixes to match the documented handler behavior.
- The blocks section overstated that includes behave unexpectedly in blocks. Reworded it to describe the real tradeoff: dynamic includes expand at runtime and can be harder to trace, while imports provide static expansion.
- The debug snippet labeled `lookup('config', 'DEFAULT_ROLES_PATH')` as `ansible_search_path`. Updated it to print the actual `ansible_search_path` magic variable separately from `DEFAULT_ROLES_PATH`.

## Review Notes
Local `ansible-playbook` was not installed in the workspace, so CLI behavior could not be checked with local `--help` output or syntax checks. The command flags and behaviors were verified against current official Ansible documentation instead.
