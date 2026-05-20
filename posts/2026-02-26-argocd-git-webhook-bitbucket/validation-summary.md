# Validation Summary: How to Configure Git Webhook for Bitbucket in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Bitbucket Cloud
- Bitbucket Server / Bitbucket Data Center
- Kubernetes Secrets and ConfigMaps
- Webhooks
- curl

## Sources Consulted
- Argo CD webhook configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD reconciliation interval FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD argocd-cm example: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/argocd-cm-yaml/
- Bitbucket Cloud REST API repository webhooks: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/
- Bitbucket Cloud workspace webhooks documentation: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/
- Bitbucket Cloud webhook management documentation: https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/
- Bitbucket Server REST API webhook documentation: https://docs.atlassian.com/bitbucket-server/rest/latest/bitbucket-rest.html

## Issues Found
- The Bitbucket Cloud flow incorrectly generated a local UUID before creating the webhook. Argo CD verifies the Bitbucket Cloud `X-Hook-UUID` header against `webhook.bitbucket.uuid`, so the configured value must be the UUID assigned by Bitbucket Cloud to the webhook. Updated the steps to create/list the webhook first, capture the assigned UUID, and then configure `argocd-secret`.
- The Bitbucket Cloud API example did not show how to obtain the UUID needed by Argo CD. Updated it to capture `.uuid` from the create-webhook response with `jq`.
- The `timeout.reconciliation` example used `"600"`. Argo CD documents this setting as a duration string such as `60s`, `1m`, or `1h`. Updated the value to `"10m"`.

## Review Notes
Bitbucket Cloud also supports a webhook `secret` field for `X-Hub-Signature`, but Argo CD's Bitbucket Cloud handling uses the Bitbucket-assigned hook UUID for the documented verification/callback path. The Bitbucket Server/Data Center REST examples and `webhook.bitbucketserver.secret` key matched official documentation.
