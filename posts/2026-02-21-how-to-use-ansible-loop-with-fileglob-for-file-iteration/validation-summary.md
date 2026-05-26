# Validation Summary: How to Use Ansible loop with fileglob for File Iteration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.fileglob lookup plugin
- Ansible loop and loop_control
- ansible.builtin.copy, ansible.builtin.template, ansible.builtin.find, and ansible.builtin.command modules
- Jinja2/Ansible filters such as basename, regex_replace, relpath, and sort

## Sources Consulted
- Ansible fileglob lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible lookups documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible relpath filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/relpath_filter.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible fileglob lookup source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/lookup/fileglob.py

## Issues Found
- The post described `query` as a replacement for `lookup`. Official Ansible documentation describes `query` as a list-returning lookup helper equivalent to `lookup(..., wantlist=True)`, while `lookup` remains valid. Updated the wording to call `query` the modern option for invoking lookups when a list is needed.
- The migration example used `fileglob` to collect local controller paths, then ran `ansible.builtin.command` without delegation. Since Ansible command tasks execute on selected target nodes by default, those controller-side paths might not exist on the target. Updated the task to `delegate_to: localhost` and used `argv` so the local file path is passed safely as a single argument.

## Review Notes
The remaining examples and explanations align with official Ansible behavior: `fileglob` matches files on the controller, is non-recursive, should use `wantlist=True` or `query` when feeding `loop`, and `find` is the correct module for discovering files on managed nodes.
