# Validation Summary: How to Create a Callback Plugin for Webhook Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration and environment variables
- Python
- HTTP webhooks
- Slack incoming webhooks
- Microsoft Teams incoming webhooks

## Sources Consulted
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible plugin development and configuration documentation: https://docs.ansible.com/projects/ansible-core/2.16/dev_guide/developing_plugins.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible `open_url` API from the locally installed ansible-core 2.21.0 package
- Python 3.12 datetime deprecations: https://docs.python.org/3.12/deprecations/index.html
- Slack incoming webhook documentation: https://api.slack.com/messaging/webhooks
- Microsoft Teams incoming webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook

## Issues Found
- The plugin marked `webhook_url` as `required: true`, but the implementation intended to warn and continue when no URL is configured. In ansible-core 2.21.0 this raises `AnsibleRequiredOptionError` during `set_options()`, so I changed the option to default to an empty string.
- The code used `datetime.datetime.utcnow()`, which is deprecated in Python 3.12. I replaced it with `datetime.datetime.now(datetime.timezone.utc)`.
- The playbook completion status only counted task failures and ignored unreachable hosts, even though unreachable hosts make Ansible runs fail. I added `v2_runner_on_unreachable()`, tracked unreachable failures, included unreachable counts in the summary, and marked the playbook as failed when any host is unreachable.
- The environment-variable configuration example enabled the callback but did not set a callback plugin search path. I added `ANSIBLE_CALLBACK_PLUGINS="./callback_plugins"` so the custom plugin can be found without relying on the earlier `ansible.cfg` snippet.

## Review Notes
- Verified the extracted plugin code with `python3 -m py_compile`.
- Loaded the plugin through Ansible's callback loader and confirmed `set_options()` succeeds without a configured webhook URL.
- Ran a local `ansible-playbook` execution through `python3 -m ansible.cli.playbook` with a local webhook receiver and confirmed `playbook_start` and `playbook_complete` payloads were posted successfully.
- Microsoft Teams connector and incoming webhook behavior is changing over time; the documented MessageCard-style payload remains supported by the current Microsoft incoming webhook documentation, but Adaptive Cards are the more current Teams card format for future revisions.
