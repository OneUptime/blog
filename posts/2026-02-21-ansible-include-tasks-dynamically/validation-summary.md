# Validation Summary: How to Include Tasks Dynamically with include_tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.include_tasks
- ansible.builtin.import_tasks
- Ansible tags
- Ansible loops and conditionals
- YAML

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.include_tasks module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible Core Documentation: Reusing Ansible artifacts - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse.html
- Ansible Community Documentation: Tags - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Documentation: import_tasks module - https://docs.ansible.com/projects/ansible/2.9/modules/import_tasks_module.html

## Issues Found
- The post said dynamically constructed task file names are impossible with static `import_tasks`. Ansible documentation says imported task file names can be templated if the variables are available during pre-processing, but cannot depend on inventory variables or other runtime-only values. I updated the wording to reflect that distinction.
- The post said tags applied to `include_tasks` propagate to all tasks within the included file. Ansible documentation says tags on dynamic includes apply only to the include itself unless tag inheritance is added with `apply` or a tagged block. I updated the explanation and examples to use `apply.tags` while keeping the include itself tagged.
- The comparison list said to use `import_tasks` when tags on individual tasks inside the file need to work with `--tags`. Dynamic includes can also selectively run tagged tasks inside an included file when the include itself is tagged. I changed the guidance to focus on tag inheritance from the import to every imported task.

## Review Notes
The examples use Ansible short module names such as `apt`, `yum`, `service`, `user`, and `include_tasks`. These are commonly accepted in playbooks, though Ansible documentation recommends fully qualified collection names such as `ansible.builtin.include_tasks` for clearer linking and to avoid name conflicts.
