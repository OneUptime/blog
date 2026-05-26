# Validation Summary: How to Write Python Scripts that Invoke Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python subprocess module
- Ansible
- ansible-playbook CLI
- Ansible callback plugins
- JSON output parsing

## Sources Consulted
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible stdout callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- Ansible ansible.posix.json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Python subprocess documentation: https://docs.python.org/3/library/subprocess.html

## Issues Found
- The JSON callback example used `ANSIBLE_STDOUT_CALLBACK=json`. Current Ansible documentation lists the JSON stdout callback as `ansible.posix.json`, and the callback is part of the `ansible.posix` collection rather than `ansible-core`. Updated the prose and environment variable value accordingly.

## Review Notes
- The local environment did not have `ansible-playbook` installed, so CLI validation was performed against the current official Ansible documentation instead of local `--help` output.
- All Python code blocks were checked with `ast.parse` and are syntactically valid.
- `ANSIBLE_LOAD_CALLBACK_PLUGINS` is not required for `ansible-playbook` because callback plugins are always loaded there, but it is harmless and was left unchanged to preserve the post's scope.
