# Validation Summary: How to Use AWX Webhook Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX job templates and webhooks
- Ansible playbooks
- GitHub webhooks and repository hooks API
- GitLab project webhooks
- curl, JSON, HMAC signatures, OpenSSL

## Sources Consulted
- AWX user guide: Working with Webhooks: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/webhooks.html
- AWX user guide: Job Templates webhook fields: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX OpenAPI schema/reference: https://docs.ansible.com/projects/awx/en/latest/open_api/
- AWX source code for webhook key and receiver behavior: https://github.com/ansible/awx/blob/devel/awx/api/views/webhooks.py
- AWX source code for job template serializer fields and related URLs: https://github.com/ansible/awx/blob/devel/awx/api/serializers.py
- GitHub Docs: Validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub REST API: Repository webhooks: https://docs.github.com/en/rest/repos/webhooks
- GitLab Docs: Project webhooks: https://docs.gitlab.com/user/project/integrations/webhooks/

## Issues Found
- The post described AWX webhooks as generic external-system triggers. AWX webhook receivers are service-specific SCM integrations, so I narrowed the claim to supported source control systems and noted that recent AWX versions also expose a Bitbucket Data Center receiver.
- The post said GitLab signs payloads with the webhook key. GitLab sends the configured Secret token, which AWX compares with the `X-Gitlab-Token` header, so I corrected that explanation.
- The post attempted to read `webhook_key` directly from the job template response. AWX exposes the key through the related `/webhook_key/` endpoint, so I changed the retrieval example.
- The post showed setting a custom `webhook_key` with `PATCH /api/v2/job_templates/{id}/`. AWX rotates webhook keys with `POST /api/v2/job_templates/{id}/webhook_key/`, so I replaced the section with key rotation.
- The GitHub API example used a literal `"${WEBHOOK_KEY}"` inside single-quoted JSON. I changed the quoting so the shell variable expands.
- The webhook credential section described credentials as extra verification for incoming requests and used a hard-coded credential type ID. AWX webhook credentials are PAT credentials for posting status back to the SCM service, and credential type IDs are instance-specific, so I changed the example to look up the `github_token` credential type first.
- The post implied AWX status updates apply broadly to GitHub/GitLab events. AWX documentation limits GitHub status updates to pull request events and GitLab status updates to merge request events, so I clarified that.
- The curl test used GitHub's SHA-256 signature header. AWX's GitHub receiver currently checks `X-Hub-Signature` with SHA-1, so I changed the test command to generate `sha1=` and send `X-Hub-Signature`, plus a delivery GUID header.
- The troubleshooting section said an AWX user associated with the webhook needs Execute permission. The receiver is unauthenticated and launches based on the configured template, so I replaced that with guidance about logs and duplicate delivery GUIDs.

## Review Notes
The tutorial is now accurate for the documented AWX webhook model. Future improvements could add a separate GitLab-specific payload example because GitLab event type strings differ from GitHub's `push` and `pull_request` values.
