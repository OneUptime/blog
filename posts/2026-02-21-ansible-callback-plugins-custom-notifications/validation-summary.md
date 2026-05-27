# Validation Summary: How to Use Ansible Callback Plugins for Custom Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible callback plugins
- Python
- Webhook notifications
- Microsoft Teams incoming webhooks and Adaptive Cards
- Discord webhooks and embeds
- Google Chat incoming webhooks

## Sources Consulted
- Ansible Core callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible current configuration reference for callback plugin settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Installed ansible-core 2.21.0 source for callback loader compatibility and callback config names
- Ansible community.general Slack callback documentation: https://docs.ansible.com/ansible/latest/collections/community/general/slack_callback.html
- Microsoft Teams incoming webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Discord message and embed object documentation: https://discord.com/developers/docs/resources/message
- Google Chat incoming webhook quickstart: https://developers.google.com/workspace/chat/quickstart/webhooks

## Issues Found
- The examples used `CALLBACK_NEEDS_WHITELIST`, an older callback flag. Updated the callback examples to `CALLBACK_NEEDS_ENABLED`, which matches current Ansible callback plugin naming while remaining consistent with the enable-by-configuration pattern.
- The `ansible.cfg` example used `callback_whitelist`, an older configuration key. Updated it to `callbacks_enabled`, the current key documented by Ansible.
- The introduction said Ansible ships with Slack and email callbacks. Updated the wording to "built-in and collection-provided" because the current Slack callback is provided by the `community.general` collection, not ansible-core.

## Review Notes
- The Microsoft Teams incoming webhook payload follows the documented Adaptive Card wrapper format. Microsoft documents connector deprecation and recommends Workflows for new Teams webhook scenarios, so this topic may need future updates if connector availability changes.
- The Discord embed payload uses documented fields and stays within the field count pattern, but production code should check HTTP response status codes to surface webhook validation errors.
- The Google Chat payload uses the documented simple `text` message format for incoming webhooks.
