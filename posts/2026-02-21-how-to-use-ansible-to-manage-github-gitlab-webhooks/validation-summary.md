# Validation Summary: How to Use Ansible to Manage GitHub/GitLab Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.uri
- GitHub REST API repository webhooks
- GitLab project webhooks API
- Webhook secret verification

## Sources Consulted
- GitHub Docs: REST API endpoints for repository webhooks: https://docs.github.com/en/rest/repos/webhooks
- GitLab Docs: Project webhooks API: https://docs.gitlab.com/api/project_webhooks/
- Ansible Community Documentation: ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible Community Documentation: ansible.builtin.password lookup: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html

## Issues Found
- The GitHub webhook update example changed the webhook URL without preserving the secret. GitHub's update endpoint removes a previously configured secret unless the same or a new secret is supplied. Added `webhook_secret` and included it in the update body.
- The GitHub examples used the older `application/vnd.github.v3+json` media type and omitted the current recommended `X-GitHub-Api-Version` header. Updated GitHub examples to use `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: "2026-03-10"`.
- The first GitHub create example treated any non-created result as `already exists`, even though GitHub documents `422` as validation failure or spam protection. Changed the debug fallback text to avoid incorrectly classifying every `422` response.
- The CI/CD example generated the webhook secret with the password lookup against `/dev/null` and then printed it. Ansible documents that `/dev/null` causes a new password to be generated each time and not stored. Changed the example to read `WEBHOOK_SECRET` from the environment and avoid printing the secret.
- The practical example attempted to send raw GitHub webhook payloads directly to a Slack incoming webhook URL. Slack incoming webhooks are not direct GitHub event receivers. Changed that example to use a generic chat notification endpoint that can process GitHub webhook payloads.

## Review Notes
The examples use raw API calls through `ansible.builtin.uri`, which is valid. They are suitable for illustrating API-driven webhook management, but production playbooks should add explicit failure handling for `422` responses and should source secrets from Ansible Vault or another secret manager rather than plain environment variables.
