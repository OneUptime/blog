# Validation Summary: How to Use Ansible with Slack for Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible callback plugins
- `community.general.slack`
- `community.general.timezone`
- `community.general.ufw`
- `ansible.builtin.uri`
- Slack incoming webhooks

## Sources Consulted
- Ansible `community.general.slack` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html
- Ansible `community.general.slack` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_callback.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible configuration settings for `callbacks_enabled`: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/

## Issues Found
- The webhook example set `channel` and `username` in the incoming webhook payload. Slack's current incoming webhook documentation states that channel, username, and icon inherit from the Slack app configuration and cannot be overridden. Removed those fields and added a top-level `text` fallback message, which Slack documents for webhook payloads.
- The callback plugin example used `callback_whitelist`, which is outdated for current Ansible configuration. Replaced it with `callbacks_enabled`.
- The callback plugin settings were shown as group variables (`slack_webhook_url` and `slack_channel`), but the official callback documentation configures these under the `[callback_slack]` section or via environment variables. Moved the webhook URL and channel into `ansible.cfg`.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current Ansible documentation lists the module as `community.general.timezone`. Updated the FQCN.

## Review Notes
The local environment did not include `ansible-playbook`, so Ansible's own `--syntax-check` could not be run. The snippets were reviewed against current official Ansible and Slack documentation.
