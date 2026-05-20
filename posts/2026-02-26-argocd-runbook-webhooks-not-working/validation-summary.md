# Validation Summary: ArgoCD Runbook: Webhooks Not Working

## Status
validated

## Post Type
Runbook / Troubleshooting Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Kubernetes Ingress
- Kubernetes NetworkPolicy
- GitHub webhooks
- GitLab webhooks
- Bitbucket Cloud webhooks
- kubectl
- curl

## Sources Consulted
- Argo CD Git Webhook Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD ApplicationSet Git Generator webhook configuration: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Pull Request Generator webhook configuration: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD FAQ for polling interval and `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD `argocd-server` command reference for `--rootpath` and webhook parallelism: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD webhook handler source for HTTP response behavior: https://github.com/argoproj/argo-cd/blob/master/util/webhook/webhook.go
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- GitHub webhook creation documentation: https://docs.github.com/developers/webhooks-and-events/webhooks/creating-webhooks
- GitHub IP address documentation: https://docs.github.com/en/github/authenticating-to-github/about-githubs-ip-addresses
- GitLab webhook documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab webhook events documentation: https://docs.gitlab.com/user/project/integrations/webhook_events/
- Bitbucket Cloud webhook event payloads: https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/
- Bitbucket Cloud webhook management: https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/

## Issues Found
- Argo CD webhook secrets were shown in `argocd-cm`. Current Argo CD documentation stores Git provider webhook secret keys in the `argocd-secret` Kubernetes Secret, so the check, YAML example, and patch command were updated to use `argocd-secret` with `stringData`.
- The Bitbucket Cloud secret key was listed as `webhook.bitbucket.secret`. Argo CD uses `webhook.bitbucket.uuid` for Bitbucket Cloud webhook UUID verification, so the key was corrected.
- The post said the API server must be restarted after updating the webhook secret. Argo CD documentation says changes to the API server webhook secret take effect automatically, so the restart instruction was removed.
- The manual `curl` test implied it would work the same way when a webhook secret is configured and mapped secret failures to `403`. The post now notes that provider test/redelivery should be used when signatures are required, and that malformed payloads, missing event headers, or signature failures generally surface as `400/401`.
- The NetworkPolicy example used static GitHub CIDRs without emphasizing they are examples. GitHub documents that IP ranges can change and recommends using the Meta API if allowlisting is required, so the snippet and prevention guidance now say to fetch and monitor current provider-published ranges.
- The ApplicationSet pull request webhook note was too broad. The post now states that ApplicationSet webhooks are configured separately and should select the events required by the generator.
- The verification step checked `Last Synced` immediately after a push. A webhook triggers refresh/detection, while `Last Synced` changes only after a sync. The verification command now checks the application status generally and clarifies the automated-sync caveat.
- The opening description said disabled polling would wait for the next reconciliation cycle, which was misleading for Git change detection when automatic polling is disabled. It now says detection requires a manual refresh or another reconciliation trigger.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI syntax was checked against Kubernetes reference documentation rather than local `--help` output.
- The runbook intentionally uses placeholder domains and repository names; these are plausible examples and do not need live URL validation.
