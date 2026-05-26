# Validation Summary: How to Use the Ansible uri Module with POST Requests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.uri` module
- HTTP POST requests
- JSON, form-urlencoded, raw XML/SOAP, and webhook request bodies
- Slack incoming webhooks
- Microsoft Teams incoming webhooks and MessageCard payloads
- GitLab pipeline trigger API
- Jenkins Remote Access API

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `uri` module source for result `changed` behavior: https://raw.githubusercontent.com/ansible/ansible/devel/lib/ansible/modules/uri.py
- Ansible conditionals documentation for `is changed`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible error handling documentation for `changed_when`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible loops/retries documentation for `until`, `retries`, and `delay`: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Slack incoming webhooks documentation: https://api.slack.com/incoming-webhooks
- Slack legacy incoming webhooks documentation: https://api.slack.com/legacy/custom-integrations/messaging/webhooks
- Microsoft Teams incoming webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft legacy MessageCard reference: https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference
- GitLab pipeline trigger documentation: https://docs.gitlab.com/ci/triggers/
- Jenkins Remote Access API documentation: https://www.jenkins.io/doc/book/using/remote-access-api/

## Issues Found
- The idempotent POST example used `create_result is changed`, but `ansible.builtin.uri` sets `changed` to `false` for normal HTTP requests unless writing a downloaded file to `dest`. Added `changed_when: true` to the resource creation task so the subsequent `create_result is changed` expression correctly distinguishes created resources from skipped ones.
- The Slack webhook example set `channel`, `username`, and `icon_emoji` in the payload. Current app-based Slack incoming webhooks cannot override the destination channel, username, or icon at runtime. Replaced those fields with a `text` fallback while keeping the attachment body.
- The Microsoft Teams MessageCard example omitted the required `@context` field. Added `@context: "https://schema.org/extensions"` to match the MessageCard reference.

## Review Notes
- The YAML snippets parse successfully with PyYAML.
- `ansible` and `ansible-doc` were not installed in the local environment, so Ansible behavior was verified against official Ansible documentation and the upstream module source.
- Microsoft notes that Microsoft 365 Connectors are nearing deprecation and recommends Workflows or newer Teams app approaches for new integrations. The MessageCard example is still valid for legacy connector-style incoming webhooks, but future posts should consider Adaptive Cards or Workflows for Teams.
