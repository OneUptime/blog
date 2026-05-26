# Validation Summary: How to Migrate from with_fileglob to loop in Ansible

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible playbooks
- Ansible loops and `with_*` loop syntax
- `ansible.builtin.fileglob` lookup plugin
- `ansible.builtin.find` module
- Ansible path filters such as `relpath`
- `ansible.builtin.copy` and `ansible.builtin.template`

## Sources Consulted
- Ansible `ansible.builtin.fileglob` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- Ansible loop and `with_X` migration guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible task path search documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.relpath` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/relpath_filter.html
- Ansible `community.general.filetree` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filetree_lookup.html

## Issues Found
- The post described `loop` plus `fileglob` as the modern replacement for `with_fileglob`. Ansible's official loop documentation says lookup-based `with_*` loops such as `with_fileglob` can still be clearer to leave unchanged. Updated the language to describe the `loop` form as a valid loop-based equivalent and added a note about Ansible's guidance.
- The path resolution section said `fileglob` resolves template paths relative to a role's `templates/` directory. Official task path documentation describes local task path search more generally, and `fileglob` does not use the `template` module's `src` resolution rules by itself. Updated the wording to tell readers to include `templates/` in the glob or verify the search path.
- The preserve-structure example used `query('fileglob', 'files/static/**/*')` for recursive discovery, but `fileglob` is documented as non-recursive. Replaced that example with an `ansible.builtin.find` task delegated to localhost and used `relpath` against the static source root.
- The post referred to the `filetree` lookup without its collection name. Current Ansible documentation places it under `community.general.filetree`, so the references were updated.

## Review Notes
Ansible was not installed in the local environment, so validation was performed against official Ansible documentation rather than local `ansible-doc` or playbook execution. The remaining examples are syntactically consistent with Ansible playbook YAML and documented lookup/module behavior.
