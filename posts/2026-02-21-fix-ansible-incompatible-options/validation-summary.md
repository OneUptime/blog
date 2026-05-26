# Validation Summary: How to Fix Ansible Incompatible Options Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible
- Ansible built-in modules: copy, file, apt, lineinfile, setup, debug, package, timezone, hostname, template, uri, command, fail, cron, service
- community.general.ufw
- YAML playbooks
- cron

## Sources Consulted
- Ansible module architecture documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_program_flow_modules.html
- ansible.builtin.copy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.file documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- ansible.builtin.apt documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.lineinfile documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible devel source for apt, file, and lineinfile module argument validation: https://github.com/ansible/ansible/tree/devel/lib/ansible/modules

## Issues Found
- The `lineinfile` example claimed that `insertafter` with `state=absent` was a mutually exclusive parameter error. The current module documentation says `insertafter` is used with `state=present`, but the module's actual mutually exclusive validation is for combinations such as `insertbefore` with `insertafter`, `regexp` with `search_string`, and `backrefs` with `search_string`. I changed the example to show `insertbefore` and `insertafter` together as the invalid combination, with a corrected version using only `insertafter`.
- The section heading "Common Mutually Exclusive Parameters" was too narrow because the `file` module example is a state-specific invalid combination rather than a formal `mutually_exclusive` pair. I changed it to "Common Incompatible Parameter Combinations" to accurately cover both mutually exclusive parameters and state-specific validation errors.

## Review Notes
- The `file` module example is technically accurate as an incompatible combination: the `src` option requires `state=link` or `state=hard`.
- The `apt` module example is accurate: the current source declares `deb`, `package`/`name`, and `upgrade` as mutually exclusive.
- The later "Common Use Cases" playbooks are syntactically plausible examples, but they are broad generic Ansible snippets rather than examples specific to incompatible options errors.
