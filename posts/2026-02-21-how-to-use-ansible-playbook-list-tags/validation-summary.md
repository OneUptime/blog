# Validation Summary: How to Use Ansible Playbook --list-tags

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible playbook tags
- YAML
- Bash

## Sources Consulted
- Ansible Community Documentation: Tags - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Community Documentation: ansible-playbook CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html

## Issues Found
- The post described `--list-tags` as showing all tags and giving a complete inventory. Official Ansible documentation notes that `--list-tags` and `--list-tasks` cannot show tags or tasks inside dynamically included files or roles, so I changed the wording to say it lists tags Ansible can discover statically.
- The post said "This three-step workflow" but listed four steps. I changed it to "four-step workflow."
- The post said Ansible has two special tags. Official documentation reserves several tag names, including `always`, `never`, `tagged`, `untagged`, and `all`, while `always` and `never` are the two special tags mostly used on tasks. I changed the wording to "two special task tags."
- The description of `always` was too absolute. Official documentation says tasks tagged `always` can still be skipped with `--skip-tags always` or by skipping another tag on the same task. I updated the bullet and related inline comment.
- The description of `never` was incomplete. Official documentation says a task tagged `never` runs when `never` or another tag defined on that task is explicitly requested. I updated the bullet to reflect that behavior.

## Review Notes
The local environment did not have `ansible-playbook` installed, so CLI behavior was verified against the current official Ansible documentation instead of local `--help` output. The playbook snippets use valid Ansible/YAML syntax and current command-line flags.
