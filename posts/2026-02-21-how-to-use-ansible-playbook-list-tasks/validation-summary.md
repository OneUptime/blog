# Validation Summary: How to Use Ansible Playbook --list-tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible playbooks, roles, tags, imports, and includes
- Bash scripting for Ansible output

## Sources Consulted
- Ansible Community Documentation: ansible-playbook CLI options, including `--list-tasks`, `--tags`, `--skip-tags`, `--limit`, `--check`, `--syntax-check`, and `--extra-vars`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Community Documentation: Tags, tag selection, skip tags, and previewing tagged tasks with `--list-tasks`: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Community Documentation: `ansible.builtin.import_tasks` static task import behavior: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_tasks_module.html
- Ansible Community Documentation: `ansible.builtin.include_tasks` dynamic task include behavior: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html

## Issues Found
- The introduction said `--list-tasks` shows tasks from "included files" without distinguishing static imports from dynamic includes. Changed this to say Ansible lists tasks it can determine before execution, including roles and static imports, because dynamic `include_tasks` entries are processed at runtime and their contents are not expanded in the list.
- The "Working with Complex Playbooks" section said `--list-tasks` resolves roles, imports, and includes as the full task chain. Changed this wording to roles and static imports only, matching Ansible's static import versus dynamic include behavior.
- The check mode example implied `--list-tasks --check` shows what would be checked in a dry run. Clarified that `--list-tasks` still only lists selected tasks when combined with `--check`.
- The "count tasks per role" script used `grep "TAGS:"`, which also matches play header lines and can produce incorrect role counts. Replaced it with an `awk` filter that only extracts role-prefixed task lines.
- The project summary script counted every `TAGS:` line, including play headers. Replaced it with an `awk` counter that counts task lines and skips play headers.

## Review Notes
The local environment did not have `ansible-playbook` installed, so CLI behavior was verified against current official Ansible documentation and the shell parsing snippets were checked against representative `--list-tasks` output. The post uses short module names such as `uri`, `debug`, `import_tasks`, and `include_tasks`; these remain valid, though Ansible documentation recommends fully qualified collection names for clearer linking and avoiding collection name conflicts.
