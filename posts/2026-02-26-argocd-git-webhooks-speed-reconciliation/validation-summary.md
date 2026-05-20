# Validation Summary: How to Use Git Webhooks to Speed Up Reconciliation in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Git webhooks
- Kubernetes Ingress, Service, Secret, and ConfigMap resources
- ingress-nginx annotations
- GitHub webhook signatures and delivery IP ranges
- kubectl and argocd CLI usage

## Sources Consulted
- Argo CD Webhook Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD FAQ, repository polling and reconciliation interval: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD High Availability / application controller settings and reconciliation jitter: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- GitHub Docs, validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub Docs, webhook events and payload headers: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub Docs, webhook best practices and IP allowlists: https://docs.github.com/webhooks/using-webhooks/best-practices-for-using-webhooks
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post implied that detecting a Git change always starts a sync. Updated the introduction, diagrams, and architecture description to clarify that Argo CD refreshes application status first, then syncs automatically only when auto-sync is enabled; otherwise the application is marked OutOfSync.
- The nginx Ingress examples routed to Argo CD's HTTPS service without declaring the backend protocol. Added `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` to match Argo CD's documented ingress-nginx behavior when using the HTTPS backend.
- The dedicated webhook service wording said a Service could expose only a path. Updated it to clarify that the Ingress rule restricts the `/api/webhook` path.
- The reconciliation interval examples used unitless values such as `"600"`. Updated them to `"10m"` to match current Argo CD documentation, which describes `timeout.reconciliation` as a duration string.
- The performance section used the non-current `controller.reconciliation.jitter` key in `argocd-cmd-params-cm`. Updated it to `timeout.reconciliation.jitter: "30s"` in `argocd-cm`.
- The jitter section implied jitter spreads webhook-triggered reconciliations. Updated it to state that jitter applies to periodic fallback reconciliation, not webhook-triggered refreshes.
- The firewall section listed static GitHub IP ranges. Replaced them with the GitHub meta API command for the current `hooks` ranges.

## Review Notes
- The webhook secret keys, `/api/webhook` endpoint, GitHub `X-Hub-Signature-256` usage, and `kubectl logs` examples are consistent with the consulted documentation.
- Argo CD documentation also includes Azure DevOps webhook secret keys, but the post's existing provider list and examples remain technically valid for the providers shown.
