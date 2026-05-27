# Validation Summary: How to Use the Ansible yaml Callback Plugin

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible callback plugins
- Ansible callback result formatting
- YAML output formatting
- Ansible ad hoc commands and playbooks
- Ansible debug, setup, and uri modules

## Sources Consulted
- Ansible documentation: ansible.builtin.default callback, including `callback_result_format`, `callback_format_pretty`, and non-machine-parseable output notes: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible documentation: community.general.yaml callback deprecation and removal notice: https://docs.ansible.com/projects/ansible/11/collections/community/general/yaml_callback.html
- Ansible documentation: current stdout callback plugin index showing no current `yaml` stdout callback in ansible.builtin: https://docs.ansible.com/ansible/latest/collections/callback_index_stdout.html
- Ansible documentation: callback plugin behavior, stdout callback limits, `callbacks_enabled`, and ad hoc callback loading with `ANSIBLE_LOAD_CALLBACK_PLUGINS`: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible configuration settings: `callbacks_enabled`, `ANSIBLE_CALLBACKS_ENABLED`, `ANSIBLE_STDOUT_CALLBACK`, and `ANSIBLE_LOAD_CALLBACK_PLUGINS`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible documentation: ansible.builtin.setup module and `filter` examples: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible documentation: ansible.builtin.debug module `msg` and `var` parameters: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible documentation: ansible.builtin.uri module `headers`, `return_content`, and return values: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: ansible.posix.json callback for JSON stdout output: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html

## Issues Found
- The post presented `stdout_callback = yaml` and `ANSIBLE_STDOUT_CALLBACK=yaml` as the current way to enable YAML output. Current Ansible uses `callback_result_format = yaml` on the `ansible.builtin.default` callback; the old `community.general.yaml` stdout callback is deprecated and removed from current `community.general` releases. Updated the configuration and command examples to use `stdout_callback = default` plus `callback_result_format = yaml`, and added a legacy note for `community.general.yaml`.
- The ad hoc `ansible` command example did not account for the fact that ad hoc commands need callback plugins loaded explicitly to use the configured stdout callback. Updated the example to include `ANSIBLE_LOAD_CALLBACK_PLUGINS=1`, `ANSIBLE_STDOUT_CALLBACK=default`, and `ANSIBLE_CALLBACK_RESULT_FORMAT=yaml`.
- The recommended project-level config used the old `callback_whitelist` setting. Replaced it with the current `callbacks_enabled` setting.
- The post described the YAML callback as the standard modern approach. Updated wording throughout to distinguish current YAML-formatted callback results from the deprecated legacy YAML stdout callback.
- The machine-parseable output advice referred generically to a `json` callback. Updated it to reference the current `ansible.posix.json` callback and clarified that structured JSON can be written separately when CI/CD logs need both human-readable and machine-readable output.
- The performance section claimed YAML conversion adds "microseconds per task" without an official basis. Reworded this to a conservative "small performance overhead" that is normally negligible compared with task execution.

## Review Notes
The examples for `debug`, `setup`, `uri`, `--diff`, `--check`, and YAML syntax are consistent with current Ansible documentation. The post remains a valid technical guide after updating it from the removed/deprecated YAML callback to the current `callback_result_format = yaml` approach.
