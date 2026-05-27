# Validation Summary: How to Understand the Difference Between include and import in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible static imports
- Ansible dynamic includes
- Ansible task files, roles, variable files, tags, conditionals, loops, and CLI task listing

## Sources Consulted
- Ansible Community Documentation: Reusing Ansible artifacts, https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse.html
- Ansible Community Documentation: Tags, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Community Documentation: ansible.builtin.include_tasks, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible Core Documentation: ansible.builtin.include module in ansible-core 2.13, https://docs.ansible.com/projects/ansible-core/2.13/collections/ansible/builtin/include_module.html
- Ansible Community Documentation: ansible-core 2.12 Porting Guide, https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_core_2.12.html

## Issues Found
- The directive list claimed to be complete but omitted `include_vars`. Added `include_vars` and clarified that there is no `import_vars`; `vars_files` is used for static variable files.
- The tag behavior section said internal tags with `include_tasks` do not work with `--tags` and that tagging the include runs all tasks in the file. Updated this to match Ansible documentation: the include itself must be selected, and Ansible then runs tasks inside the included file that share the selected tag. Also noted `apply` or a tagged block for tag inheritance.
- The variable file names section said `import_tasks` requires a literal path. Updated this because imported task and role file names can be templated when the variables are available during preprocessing; runtime facts still require `include_tasks`.
- The side-by-side comments and summary table repeated the too-strong variable path and tag claims. Updated those entries to match current Ansible behavior.
- The old bare `include` section said it was removed in Ansible 2.12. Corrected this to ansible-core 2.16 based on official module documentation; the 2.12 porting guide does not list this removal.

## Review Notes
The remaining examples use short module names such as `git`, `pip`, and `command`. Current Ansible documentation recommends fully qualified collection names for clarity, but short names remain valid for built-in modules, so this was not treated as a correctness issue.
