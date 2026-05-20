# Validation Summary: How to Configure ArgoCD to Sync on Push (Not Polling)

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps and Secrets
- Git webhooks
- GitHub webhooks and GitHub CLI
- GitLab project webhooks
- Bitbucket Cloud webhooks
- Prometheus-style monitoring

## Sources Consulted
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD FAQ for reconciliation polling and `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- GitHub REST API repository webhooks: https://docs.github.com/en/rest/repos/webhooks
- GitHub REST API organization webhooks: https://docs.github.com/en/rest/orgs/webhooks
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- GitLab project webhooks API: https://docs.gitlab.com/api/project_webhooks/
- GitLab webhooks documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- Bitbucket Cloud repository webhooks API: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/

## Issues Found
- The post said ArgoCD's default polling interval is a fixed 180 seconds. Updated this to the documented default of `120s` plus up to `60s` jitter.
- The diagrams and explanation implied that webhook or polling detection always starts a sync. Updated the wording to say ArgoCD triggers a refresh, and sync starts automatically only when automated sync is enabled.
- The webhook secret example incorrectly used the `argocd-cm` ConfigMap. Updated it to use the documented `argocd-secret` Secret with `stringData`.
- The instructions said to restart `argocd-server` after changing the webhook secret. Removed that step because Argo CD documentation says the change takes effect automatically.
- The Bitbucket Cloud key was shown as `webhook.bitbucket.secret`. Updated it to `webhook.bitbucket.uuid` and added the Bitbucket Cloud UUID caveat.
- The `openssl rand -hex 32` comment said it generated a 32-character secret. Corrected it to 64 hex characters.
- The GitHub CLI examples used `--field events='["push"]'`, which sends the wrong shape for array fields. Updated the examples to use `--field events[]=push`.
- The polling fallback example put the webhook secret in `argocd-cm` and used `timeout.reconciliation: "300"`. Removed the secret from the ConfigMap example and changed the duration to `5m`.
- The PromQL example referenced `argocd_server_request_total{path="/api/webhook"}`, which is not documented in Argo CD's API server metrics. Replaced it with a log-based check and a note to use ingress metrics if available.
- The troubleshooting section referenced the wrong location for webhook secrets. Updated it from `argocd-cm` to `argocd-secret`.

## Review Notes
The guide is technically relevant and usable after the corrections. Future improvements could mention that Argo CD supports additional providers such as Azure DevOps and Gogs, and could add a short note that ApplicationSet webhooks have separate behavior.
