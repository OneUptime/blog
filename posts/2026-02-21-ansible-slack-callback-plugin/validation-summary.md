# Validation Summary: How to Use the Ansible slack Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- `community.general.slack` callback plugin
- `community.general.slack` module
- Slack incoming webhooks
- Ansible configuration
- Ansible Vault
- Cron
- GitLab CI/CD
- Docker Ansible modules

## Sources Consulted
- Ansible `community.general.slack` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_callback.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `community.general.slack` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html
- Ansible `ansible.builtin.default` callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible `ansible.builtin.junit` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/junit_callback.html
- Ansible `ansible.posix.profile_tasks` and `ansible.posix.timer` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html and https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible `community.docker.docker_image` and `community.docker.docker_container` documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_image_module.html and https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Slack incoming webhook documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/

## Issues Found
- Replaced deprecated/old callback enablement examples using `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST` with current `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`.
- Added the `prettytable` Python requirement because the Slack callback disables itself when `prettytable` is missing.
- Corrected claims that Slack `channel` and `username` override the webhook default. The Ansible callback sends those fields, but modern Slack app incoming webhooks inherit channel and identity from the app configuration.
- Replaced inaccurate sample Slack messages with examples matching the callback's actual playbook start, play start, and final stats summary behavior.
- Removed invalid Jinja lookup usage from `ansible.cfg`; plugin configuration should use the callback's supported `SLACK_WEBHOOK_URL` environment variable.
- Updated the combined callbacks example to use `ansible.builtin.default` with `callback_result_format = yaml` instead of the removed/deprecated YAML stdout callback pattern.
- Updated timer/profile callback names to their current FQCNs and used the JUnit callback's supported `JUNIT_OUTPUT_DIR` environment variable for output location.
- Rewrote the `/etc/cron.d` example as a single cron command line because cron entries do not support shell-style backslash line continuation.
- Updated Docker tasks to use current `community.docker` FQCN module names.

## Review Notes
The Slack callback still exposes `channel` and `username` options in Ansible, but Slack may ignore them for modern incoming webhooks. Users should configure the destination channel and identity in the Slack app unless they are using legacy webhook behavior.
