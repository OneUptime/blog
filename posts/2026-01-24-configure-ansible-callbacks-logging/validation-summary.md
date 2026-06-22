# Validation Summary: How to Configure Ansible Callbacks for Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration (`ansible.cfg`)
- Ansible CLI tools (`ansible-doc`, `ansible-playbook`, `ansible-galaxy`)
- Python callback plugin development
- JSON logging and `jq`
- Syslog
- CI/CD logging with GitLab CI
- Webhook integrations

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- `community.general.log_plays` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/log_plays_callback.html
- `ansible.posix.profile_tasks` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- `ansible.posix.json` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- `community.general.yaml` removal notice: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_callback.html
- `ansible.builtin.default` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugin source examples for `community.general.log_plays` and `ansible.posix.timer`: https://github.com/ansible-collections/community.general and https://github.com/ansible-collections/ansible.posix

## Issues Found
- The post used the removed `yaml` callback as `stdout_callback = yaml`. Updated the examples to use `ansible.builtin.default` with `callback_result_format = yaml`, which is the supported replacement.
- The post treated `json` as both a stdout callback and an additional callback. Updated examples to use `stdout_callback = ansible.posix.json`, because the current JSON callback is a stdout callback and only one stdout callback can be active.
- Several callback examples used short names for collection callbacks (`timer`, `profile_tasks`, `log_plays`) without noting collection requirements. Updated examples to use FQCNs such as `ansible.posix.profile_tasks` and `community.general.log_plays`, and added the collection installation command for `ansible-core` users.
- The complete `ansible.cfg` example used `diff = True` under `[defaults]`. Updated it to the documented `[diff]` section with `always = True`.
- The custom logger callback advertised callback configuration in `ansible.cfg` but only read an environment variable directly. Added a documented `log_file` callback option and `set_options()` so the config example works.
- The custom callback examples used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware `datetime.now(timezone.utc).isoformat()`.
- The webhook callback used `requests` without listing it as a requirement. Added it to the callback documentation block.
- Removed the unused `log_level` setting from the complete `ansible.cfg` example because the custom callback did not implement that option.

## Review Notes
Ansible was not installed in the local environment, so CLI output could not be checked with local `ansible-doc` commands. I verified command names, callback types, configuration keys, and collection ownership against the official Ansible documentation and checked that all embedded Python callback examples compile syntactically.
