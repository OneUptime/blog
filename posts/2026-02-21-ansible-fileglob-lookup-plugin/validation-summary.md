# Validation Summary: How to Use the Ansible fileglob Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- `ansible.builtin.fileglob`
- `ansible.builtin.copy`
- `ansible.builtin.template`
- `ansible.builtin.file`
- `ansible.builtin.find`
- `ansible.builtin.shell`
- Python glob pattern behavior

## Sources Consulted
- Ansible `ansible.builtin.fileglob` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/fileglob_lookup.html
- Ansible lookup plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible playbook lookup documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible task path resolution documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `community.general.filetree` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/filetree_lookup.html
- Python `glob` module documentation: https://docs.python.org/3/library/glob.html

## Issues Found
- The post said `fileglob` is evaluated at playbook parse time. Ansible documentation says lookup values are evaluated when executed in a task or template, so this was corrected.
- The post described `fileglob` as returning absolute paths. Official docs describe returned values as paths, and Ansible's result depends on local task search path resolution, so the wording was changed to "local file paths."
- The conditional patch example used `ansible.builtin.command` with shell input redirection (`<`). The `command` module does not process shell metacharacters, so the example now uses `ansible.builtin.shell` with `quote`.
- The post said files are returned in alphabetical order. Ansible calls Python's `glob`, whose documentation says result order is not guaranteed, so this was corrected and the post now recommends explicit sorting when order matters.
- The recursion note referenced `with_filetree` generically. Current documentation places `filetree` in the `community.general` collection, so the text now names the `community.general.filetree` lookup.
- The role/path resolution text was too narrow. It now reflects Ansible's documented local task search paths, including the role `files` directory where appropriate.

## Review Notes
The examples otherwise use current Ansible module names and valid YAML. The post could optionally use `query('ansible.builtin.fileglob', ...)` in the future because `query` always returns a list and the fully qualified collection name improves documentation linking, but the existing `lookup('fileglob', ..., wantlist=True)` examples are valid.
