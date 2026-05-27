# Validation Summary: How to Use Ansible Python API for Programmatic Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Python API
- ansible-core
- ansible-runner
- Python
- Ansible playbooks and modules
- YAML

## Sources Consulted
- Ansible Python API documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_api.html
- Ansible Runner Python interface documentation: https://docs.ansible.com/projects/runner/en/stable/python_interface/
- Ansible Runner interface API reference: https://docs.ansible.com/projects/runner/en/stable/ansible_runner/
- Ansible playbook task keyword reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible playbook error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Local ansible-core 2.21.0 Python package introspection for `TaskQueueManager`, `PlaybookExecutor`, and `DataLoader` signatures and cleanup methods.

## Issues Found
- The post did not clearly state the official support status of the direct core Python API. Updated the introduction to note that the core API is intended for Ansible's internal use and can change between releases.
- The ad-hoc `TaskQueueManager` example used `stdout_callback=callback`, but current ansible-core 2.21.0 accepts `stdout_callback_name`, not a callback object. Updated the example to construct `TaskQueueManager` with `forks`, initialize the callback methods, and register the custom callback through `_callback_plugins`.
- The ad-hoc example used a mapping form for `action`, which ansible-core 2.21.0 reports as deprecated. Changed it to a string action built from the module name and argument string.
- The ad-hoc cleanup used `loader._tempdir`, which is not present in current ansible-core 2.21.0. Replaced it with `loader.cleanup_all_tmp_files()`.
- The examples omitted `module_path` and `start_at_task` keys from `context.CLIARGS` where current internals may read them. Added the missing keys.
- The playbook example used `ansible.builtin.timezone`, but timezone is currently documented as `community.general.timezone`, not an ansible-core builtin module. Updated the module name.
- The error-handling fallback task could stop the play before the report and final failure tasks ran if the fallback command failed. Added `failed_when: false` to the fallback task so the explicit final failure check can run.
- The "Common Use Cases" introduction referred to "this module" even though the post covers API usage rather than a specific Ansible module. Reworded it to "these API patterns."

## Review Notes
- The direct Ansible core Python API remains version-sensitive and unsupported for external use by the Ansible project; `ansible-runner` is the documented stable interface for embedding Ansible execution.
- Local checks: all Python code blocks compiled with `python3`, all YAML code blocks parsed with PyYAML, and `validation.json` was validated with `jq`. Full runtime execution against managed hosts was not performed in this workspace.
