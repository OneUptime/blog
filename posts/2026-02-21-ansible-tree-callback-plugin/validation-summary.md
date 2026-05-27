# Validation Summary: How to Use the Ansible tree Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible callback plugins
- ansible.builtin.tree callback
- ansible.cfg configuration
- Shell scripting
- Python JSON processing
- AWX / Ansible Tower

## Sources Consulted
- Ansible tree callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/tree_callback.html
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible debug module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debug_module.html
- Ansible set_fact module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible tree callback source: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/plugins/callback/tree.py
- ansible.posix timer callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- ansible.posix profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html

## Issues Found
- The post originally described tree output as containing all task results for each host. The current callback writes each host's latest ok, failed, or unreachable task result to that host's file, overwriting earlier content. Updated the description, workflow explanation, compliance note, and closing paragraph to describe per-host result snapshots instead of complete task logs.
- The examples used `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST`, which are legacy names. Updated examples to `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`.
- The examples used `ANSIBLE_CALLBACK_TREE_DIRECTORY`, but the documented tree callback environment variable is `ANSIBLE_CALLBACK_TREE_DIR`. Updated both shell examples.
- The AWX example used a Jinja `lookup()` expression inside `ansible.cfg`, which is not a valid way to template an Ansible configuration file path. Replaced it with a static shared filesystem path.
- The combined-callback example used `stdout_callback = yaml`, which is not a current ansible-core built-in stdout callback. Updated it to use the default stdout callback with `callback_result_format = yaml`.
- The combined-callback example used short names for timer and profile callbacks that now live in `ansible.posix`. Updated the snippet to use `ansible.posix.timer` and `ansible.posix.profile_tasks`.
- Added a deprecation caveat because the current ansible-core tree callback source marks the plugin deprecated and scheduled for removal in ansible-core 2.23.

## Review Notes
The local environment did not have `ansible`, `ansible-playbook`, or `ansible-doc` installed, so CLI help and live playbook execution could not be run locally. The review was performed against current official Ansible documentation and the upstream Ansible callback source.
