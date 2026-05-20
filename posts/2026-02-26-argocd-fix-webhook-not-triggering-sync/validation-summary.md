# Validation Summary: How to Fix ArgoCD Webhook Not Triggering Sync

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- GitHub webhooks
- GitLab webhooks
- Kubernetes Ingress
- GitOps reconciliation

## Sources Consulted
- Argo CD Webhook Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD FAQ on polling and `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD command parameters ConfigMap example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD webhook handler source: https://raw.githubusercontent.com/argoproj/argo-cd/master/util/webhook/webhook.go
- GitHub Docs, Creating webhooks: https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- GitHub Docs, Repository webhooks REST API: https://docs.github.com/rest/repos/webhooks
- GitLab Docs, Project webhooks: https://docs.gitlab.com/user/project/integrations/webhooks/
- Kubernetes Docs, Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Docs, kubectl patch: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said Argo CD supports "generic Git providers." Updated this to the provider list documented by Argo CD: GitHub, GitLab, Bitbucket, Bitbucket Server, Azure DevOps, and Gogs.
- The post implied webhooks directly sync applications. Updated the explanation and Mermaid diagram to clarify that webhooks trigger refreshes, and sync follows only when automated sync is enabled.
- The post presented webhook secrets as mandatory. Updated GitHub, GitLab, and secret-validation wording to match Argo CD documentation: secrets are optional, but recommended for publicly reachable Argo CD instances.
- The Bitbucket secret key was incorrect. Changed `webhook.bitbucket.secret` to `webhook.bitbucket.uuid` and added `webhook.bitbucketserver.secret` for Bitbucket Server.
- The post said the Argo CD API server must always be restarted after changing webhook secrets. Updated the note to reflect Argo CD documentation that changes normally take effect automatically, with restart only as a fallback.
- The repository listing command only handled `.spec.source.repoURL`. Updated it to include `.spec.sources[*].repoURL` for multi-source applications.
- The repository matching explanation said URLs must match exactly. Updated it to note that Argo CD normalizes common URL differences but still ignores events it cannot match.
- The post referenced a non-documented `webhook.disable` setting. Replaced that section with the documented `webhook.maxPayloadSizeMB` payload-size setting.

## Review Notes
`kubectl` was not installed in the local workspace, so kubectl command semantics were checked against Kubernetes documentation instead of local `--help` output. The example log messages are representative and may vary across Argo CD versions and log formats.
