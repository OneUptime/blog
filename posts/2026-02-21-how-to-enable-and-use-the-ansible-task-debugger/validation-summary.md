# Validation Summary: How to Enable and Use the Ansible Task Debugger

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible task debugger
- Ansible playbooks
- Ansible strategy plugins
- Ansible configuration (`ansible.cfg`)
- Ansible check mode and diff mode

## Sources Consulted
- Ansible Core documentation: Debugging tasks: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_debugger.html
- Ansible Core documentation: Configuration settings: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible documentation: `ansible.builtin.debug` strategy plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_strategy.html
- Ansible documentation: `ansible.builtin.default` callback plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible documentation: `ansible.builtin.include_tasks` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible documentation: Check mode and diff mode: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html

## Issues Found
- The introduction described the task debugger itself as a strategy plugin. Current Ansible documentation presents the task debugger as a feature that can be enabled by keyword, configuration/environment, or the legacy debug strategy. Updated the wording to avoid implying the debugger is only a strategy plugin.
- The configuration-file section said `enable_task_debugger = True` is equivalent to `debugger: on_failed` on every play. Updated this to the documented behavior: it globally enables the debugger for failed tasks by default, while the `debugger` keyword provides more granular trigger conditions.
- The debug strategy section presented `strategy: debug` as a normal replacement for `linear`. Current docs describe this as a backwards-compatible method that may be removed in the future. Updated the wording to reflect that caveat.
- The debugger command reference incorrectly showed `u <key>=<value>` as the way to update module arguments or variables. Ansible uses direct assignment for `task.args[...]` and `task_vars[...]`; `u`/`update_task` recreates the task after changing task variables. Corrected the command reference.
- The role workflow changed `task_vars` and immediately retried with `r`. Ansible documentation says `update_task` must be run before `redo` after changing task variables. Added the `u` command before `r`.
- The `include_tasks` role example placed `debugger: on_failed` on the include task, which does not apply the keyword to tasks inside the included file. Updated the example to use `include_tasks.apply.debugger`.
- The debug `ansible.cfg` used `stdout_callback = yaml`, which is outdated for current Ansible output formatting. Updated it to `stdout_callback = default` with `callback_result_format = yaml`.
- The debug `ansible.cfg` used `diff = True` under `[defaults]`. Current Ansible configuration documents diff mode as `[diff] always = True`. Updated the snippet accordingly.
- The check-mode description implied all target-system changes are categorically risk-free. Updated the wording to say Ansible simulates changes for modules that support check mode, matching the official check mode documentation.

## Review Notes
- Ansible was not installed in the local workspace, so CLI help and `ansible-doc` could not be checked locally. Review was performed against current official Ansible documentation.
