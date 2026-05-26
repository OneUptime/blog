# Validation Summary: How to Use Ansible to Execute Python Scripts on Remote Hosts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Python
- Ansible playbooks
- ansible.builtin.script
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.copy
- ansible.builtin.template
- ansible.builtin.pip
- Python virtual environments

## Sources Consulted
- Ansible managed node requirements: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- ansible.builtin.script module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible playbook keyword reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible async and polling guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The introduction incorrectly implied that using Ansible guarantees Python is already installed on managed nodes because Ansible itself requires it. Updated the wording to match the official managed-node requirement: most Ansible-generated Python code requires Python on the managed node, while exceptions exist, and the `script` module itself does not require Python unless the transferred script does.
- The explanation of the `script` module's `executable` parameter said that without it the Python file would be executed as a shell script. Updated this to reflect the official module behavior: the transferred script is processed through the remote shell, and `executable` explicitly chooses the interpreter used to invoke it.
- The `pip` virtualenv examples used `virtualenv_python: python3` while not ensuring the `virtualenv` command was installed. Updated them to use `virtualenv_command: python3 -m venv`, matching the documented approach when relying on Python's built-in `venv` module.
- The inline Python task name claimed it listed installed packages, but the script only reports Python and platform information. Updated the task name to match the code.
- The Jinja2 Python template inserted string values directly into quoted Python strings. Updated the template to render values with `to_json` and numeric values with `int`, so generated Python remains valid when variable values contain characters that need escaping.
- The JSON-over-stdin example used `shell` and `echo`, which can break on shell quoting edge cases. Updated it to use the `command` module's documented `stdin` parameter.

## Review Notes
Ansible was not installed in the local environment, so the review was performed against official Ansible documentation and static inspection rather than by running the playbooks. The examples remain illustrative and assume target hosts have the expected OS packages, Python interpreter, permissions, and referenced script files.
