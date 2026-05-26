# Validation Summary: How to Use Ansible Callback Plugins for Better Error Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration (`ansible.cfg`)
- Ansible collections (`ansible.posix`, `community.general`, `community.grafana`)
- Python custom callback plugin example
- CI output integration with JUnit XML

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- Ansible stdout callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/callback_index_stdout.html
- `ansible.builtin.default` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Removed `community.general.yaml` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_callback.html
- `ansible.posix.debug` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/debug_callback.html
- `ansible.posix.json` callback documentation: https://docs.ansible.com/projects/ansible/devel/collections/ansible/posix/json_callback.html
- `ansible.posix.timer` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- `ansible.builtin.junit` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/junit_callback.html
- `community.general.slack` callback documentation: https://docs.ansible.com/ansible/latest/collections/community/general/slack_callback.html
- `community.general.logstash` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/logstash_callback.html
- `community.grafana.grafana_annotations` callback documentation: https://docs.ansible.com/ansible/latest/collections/community/grafana/grafana_annotations_callback.html

## Issues Found
- The post recommended `stdout_callback = yaml` and `ANSIBLE_STDOUT_CALLBACK=yaml`. The `community.general.yaml` callback has been removed in `community.general` 12.0.0 and is superseded by `ansible.builtin.default` with `callback_result_format = yaml` / `ANSIBLE_CALLBACK_RESULT_FORMAT=yaml`. Updated all YAML callback examples accordingly.
- The post listed `yaml`, `json`, `debug`, `timer`, and `profile_tasks` as common built-in callbacks. Current Ansible docs list `json`, `debug`, `timer`, `profile_tasks`, and `profile_roles` under `ansible.posix`, while `dense` is in `community.general`. Updated the plugin list and examples to use current fully qualified collection names.
- Because `ansible.posix` callbacks are not included in `ansible-core`, added an `ansible-galaxy collection install ansible.posix` note for users with core-only installations.
- The multiple-callback section described only "notification" callbacks, but `timer`, `profile_tasks`, and `profile_roles` are aggregate callbacks. Updated the explanation to say aggregate or notification callbacks.
- The CI/CD JUnit example used `[callback_junit] output_dir = ./test-results/`, but current `ansible.builtin.junit` documentation exposes `output_dir` through `JUNIT_OUTPUT_DIR`, not an INI key. Removed the invalid INI block and added the correct environment variable note.
- The Grafana callback was listed as `community.general.grafana_annotations`, but current documentation places it in the `community.grafana` collection as `community.grafana.grafana_annotations`. Updated the plugin name and added the required collection install command.

## Review Notes
Local `ansible` and `ansible-doc` commands were not installed in the review environment, so CLI verification used official Ansible documentation rather than local command output. The custom callback example is structurally consistent with Ansible callback plugin APIs, but it is still illustrative and would need runtime testing in an Ansible controller environment with the callback path enabled.
