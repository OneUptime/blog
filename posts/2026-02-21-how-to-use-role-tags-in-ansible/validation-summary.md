# Validation Summary: How to Use Role Tags in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible roles
- Ansible tags
- `import_role` and `include_role`
- Ansible handlers
- `ansible.builtin.apt`, `ansible.builtin.template`, `ansible.builtin.service`, and `ansible.builtin.systemd`

## Sources Consulted
- Ansible Community Documentation: Tags: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible Community Documentation: Handlers: running operations on change: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible Community Documentation: Roles: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: `ansible.builtin.apt` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html

## Issues Found
- The handler section incorrectly stated that a handler's own tags must match the current tag filter, or be untagged, for the handler to run. Official Ansible documentation states that handlers ignore all tags and cannot be directly selected or skipped by tags. I updated the section to explain that handler execution is driven by notifications from tasks that actually ran and changed, and that tag selection should be controlled on the notifying tasks.
- The post recommended leaving handlers untagged or tagging them with `always` to ensure they fire when notified. Since handler tags are ignored for tag selection, this recommendation was misleading. I replaced it with guidance to tag the tasks that notify handlers.
- The special-tag introduction said Ansible has two built-in special tags. Current Ansible documentation reserves several special tag names, including `always`, `never`, `tagged`, `untagged`, and `all`. I changed the wording to say `always` and `never` are the two most common task-level special tags.
- The `apt` example was labeled "Wipe and reinstall packages", but `name: "*"` with `state: latest` upgrades matching packages to the latest available version; it does not wipe and reinstall packages. I changed the task name and related text to "Upgrade all packages".
- The `always` explanation omitted the fact that an `always` task can still be skipped explicitly. I added the `--skip-tags always` caveat in the prose.

## Review Notes
The remaining examples and commands are consistent with Ansible's documented tag inheritance behavior for roles, blocks, static imports, dynamic includes with `apply`, special tags, and `ansible-playbook --tags`, `--skip-tags`, and `--list-tags`. `ansible-playbook` was not installed in the local environment, so CLI validation was performed against official Ansible documentation rather than local `--help` output.
