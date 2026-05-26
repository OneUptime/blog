# Validation Summary: How to Use Ansible Ad Hoc Commands to Execute Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.script module
- ansible.builtin.shell module
- ansible.builtin.fetch module
- Ansible privilege escalation and check mode
- Bash scripting
- Python scripting

## Sources Consulted
- Ansible documentation: ansible.builtin.script module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/script_module.html
- Ansible documentation: ansible.builtin.shell module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible documentation: ansible.builtin.fetch module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/fetch_module.html
- Ansible documentation: ansible CLI - https://docs.ansible.com/ansible/latest/cli/ansible.html
- Ansible documentation: ansible.posix.json callback - https://docs.ansible.com/ansible/latest/collections/ansible/posix/json_callback.html
- Python documentation: platform.freedesktop_os_release - https://docs.python.org/3/library/platform.html#platform.freedesktop_os_release

## Issues Found
- The examples for choosing a script interpreter used `ansible_python_interpreter`, which controls Ansible's Python interpreter for Python-based module execution and does not select the interpreter for an arbitrary script. Updated the `script` examples to use the module's `executable` parameter.
- The JSON callback example used `ANSIBLE_STDOUT_CALLBACK=json` without enabling callback loading for ad hoc commands. Updated it to use `ANSIBLE_LOAD_CALLBACK_PLUGINS=1` and the current `ansible.posix.json` callback name.
- The failure-handling section used `--ignore-errors`, which is not an `ansible` ad hoc CLI option. Replaced it with a shell example that makes a non-critical remote script return success.
- The security section said check mode with `script` only verifies that the file exists locally. Updated it to reflect the module's documented partial check-mode support through `creates` and `removes`.
- The security note said transferred scripts are stored in the remote user's home directory. Updated it to the more accurate Ansible remote temporary directory.
- The log-fetch example used a wildcard in the `fetch` module's `src` argument. Replaced the generated archive name with a fixed file path and fetched that exact path, since `fetch` expects a specific remote file.

## Review Notes
The Python package-audit example uses `platform.freedesktop_os_release()`, which is available in modern Python versions and is appropriate for Linux hosts. Ansible was not installed in the local workspace, so CLI behavior was validated against official Ansible documentation instead of local `ansible-doc` output.
