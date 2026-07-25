# Validation Summary: Making Ansible Tasks Truly Idempotent with changed_when and failed_when

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- `ansible.builtin.command`
- `ansible.builtin.shell`
- `ansible.builtin.service`
- `ansible.builtin.lineinfile`
- Ansible conditionals (`changed_when`, `failed_when`, and `when`)
- Ansible handlers
- Ansible check mode and diff mode
- Jinja filters and expressions

## Sources Consulted
- [Error handling in playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)
- [ansible.builtin.command module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)
- [ansible.builtin.shell module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html)
- [ansible.builtin.service module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html)
- [ansible.builtin.lineinfile module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html)
- [ansible.builtin.from_json filter](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/from_json_filter.html)
- [Blocks and rescue handling](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html)
- [Conditionals](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html)
- [Handlers: running operations on change](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html)
- [Validating tasks: check mode and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [ansible-playbook CLI](https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html)
- [Ansible playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html)

## Issues Found
- The state-query discussion said the query always reports `ok`. `changed_when: false` suppresses the changed status but does not suppress a real command failure. Changed this to say that a successful query reports `ok`.
- The `lineinfile` task claimed to ensure the setting occurs once. With `state: present`, `lineinfile` replaces only the last line matching `regexp`; it does not remove earlier duplicate matches. Renamed the task to state the behavior it actually guarantees: ensuring the setting has the desired value.
- The handler example mixed a top-level task list with a `handlers` mapping, which is not valid YAML. Wrapped the task and handler in a minimal play with `hosts`, `tasks`, and `handlers` so the example is syntactically valid and the notification works in the shown context.
- The conclusion said operational errors stop the play. By default, a failed task stops execution for the affected host while Ansible continues on other hosts. Corrected the wording to describe the default host-level behavior.

## Review Notes
The `myappctl`, `cachectl`, `releasectl`, `routectl`, migration, initialization, and health-check commands are illustrative application-specific interfaces. Their documented return-code and output contracts are explicit assumptions in the examples rather than claims about public third-party CLIs. No deprecated Ansible modules or version-specific claims were found.
