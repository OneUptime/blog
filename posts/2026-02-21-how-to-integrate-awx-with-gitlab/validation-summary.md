# Validation Summary: How to Integrate AWX with GitLab

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- AWX
- Ansible
- GitLab
- GitLab webhooks
- GitLab CI/CD
- AWX Operator
- Kubernetes
- curl

## Sources Consulted
- AWX Working with Webhooks documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/webhooks.html
- AWX Job Templates documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX Credentials documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX OpenAPI reference: https://docs.ansible.com/projects/awx/en/latest/open_api/explorer.html
- AWX Operator custom volume documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/custom-volume-and-volume-mount-options.html
- AWX Operator custom CA documentation: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/trusting-a-custom-certificate-authority.html
- GitLab webhook events documentation: https://docs.gitlab.com/user/project/integrations/webhook_events/
- GitLab project webhooks API documentation: https://docs.gitlab.com/api/project_webhooks/
- GitLab group webhooks API documentation: https://docs.gitlab.com/api/group_webhooks/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The SSH Source Control credential example interpolated a multi-line private key directly into a JSON string, which would produce invalid JSON. I changed the command to use `jq -n --arg key "$(cat awx-gitlab-key)"` so the private key is escaped correctly.
- The post implied that adding `api` scope to the SCM clone token was enough for GitLab status updates. AWX uses a GitLab Personal Access Token credential attached to the job template as `webhook_credential` for webhook status updates, so I clarified that this is separate from the Source Control credential and added the field to the job template API example.
- The GitLab CI example used `curlimages/curl:latest` but then called `python3` to parse JSON. That image is not a Python runtime, so I changed the job image to `python:3.12-alpine` and added `apk add --no-cache curl`.
- The CI example used unquoted `echo $RESPONSE` before JSON parsing, which can mangle whitespace and shell metacharacters. I changed it to `printf '%s' "$RESPONSE"`.
- The self-hosted GitLab CA example mounted a certificate file into the AWX pods manually. AWX Operator documents `bundle_cacert_secret` with a `bundle-ca.crt` key for trusting internal CAs, so I replaced the ConfigMap and raw volume mounts with the documented secret and CR field.

## Review Notes
The remaining examples use placeholder numeric AWX IDs such as organization, credential, project, and job template IDs. They are technically plausible API examples, but real installations should resolve these IDs from their own AWX instance or use named URL support where appropriate.
