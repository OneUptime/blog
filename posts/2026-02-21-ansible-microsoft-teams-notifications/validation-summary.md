# Validation Summary: How to Use Ansible with Microsoft Teams Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `uri`, `git`, `systemd`, `block`, `rescue`, and role usage
- Microsoft Teams webhooks
- Microsoft Teams MessageCard and Adaptive Card payloads
- GitHub Actions CI/CD workflows

## Sources Consulted
- Microsoft Teams: Create Incoming Webhooks: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Teams: Manage Microsoft 365 connectors and custom connectors: https://learn.microsoft.com/en-us/microsoftteams/m365-custom-connectors
- Microsoft Teams: Card types and Adaptive Card support: https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference
- Microsoft Outlook actionable message MessageCard reference: https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible blocks and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts

## Issues Found
- The Teams setup instructions only described the older Connectors UI for creating an Incoming Webhook. Microsoft now documents Workflows as the recommended path for new webhook integrations because Microsoft 365 connectors are nearing deprecation. Updated the setup section to describe Workflows first and mention the older Incoming Webhook connector as legacy/tenant-dependent.
- The Adaptive Card example declared schema version `1.4`, while Microsoft documents that Teams mobile supports Adaptive Cards up to version `1.2`. The example only uses elements available in `1.2`, so changed the card version to `1.2` for broader Teams client compatibility.
- The failure-handling health check used `retries` and `delay` without registering a result or adding an `until` condition. Current Ansible can retry failed tasks without `until`, but this behavior is version-sensitive. Added `register: health` and `until: health.status == 200` so the example is explicit and works consistently.

## Review Notes
- The MessageCard examples use the legacy actionable message card format, which is still documented for Teams connectors and incoming webhooks but should be treated as legacy. Adaptive Cards are the better long-term format.
- Test richer cards on the Teams clients your organization uses, especially if you add features beyond Adaptive Card schema version 1.2.
