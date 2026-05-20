# Validation Summary: How to Implement Regional Failover with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- Kustomize
- ExternalDNS
- AWS Route53
- Python
- Bash
- Kubernetes CronJob

## Sources Consulted
- Argo CD Notifications triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Notifications webhook service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD CLI `argocd app list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD CLI `argocd app sync`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD CLI `argocd app wait`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD CLI `argocd cluster get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- ExternalDNS CRD source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/crd/
- ExternalDNS AWS Route53 documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS AWS provider source constants: https://github.com/kubernetes-sigs/external-dns/blob/master/provider/aws/aws.go
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Argo CD Notifications ConfigMap defined triggers and templates but did not subscribe any applications or projects to those triggers, so the notifications would not fire as shown. Added global `subscriptions` entries with a region label selector for the webhook and Slack recipients.
- The notification trigger predicates accessed `app.metadata.labels.region` and `app.status.conditions[0]` directly. That can fail when labels are absent or when the relevant condition is not the first condition. Updated the predicates to check for labels and use `any()` for `ComparisonError`.
- The cluster-unreachable webhook template read only `conditions[0].message`. Updated it to emit the message from conditions whose type is `ComparisonError`.
- The ExternalDNS Route53 health check value looked like a friendly name, but AWS health check associations require an existing Route53 health check ID. Replaced it with an explicit `<route53-health-check-id>` placeholder and added a note that ExternalDNS does not create health checks.

## Review Notes
- The Python controller code is illustrative and depends on organization-specific clients and methods such as `update_region_status`, `update_git_config`, and `notify_failover`; those would need concrete implementations before production use.
- The ExternalDNS DNSEndpoint example uses provider-specific keys (`aws/weight`, `aws/health-check-id`) that match ExternalDNS endpoint provider-specific fields. Annotation equivalents use `external-dns.alpha.kubernetes.io/aws-weight` and `external-dns.alpha.kubernetes.io/aws-health-check-id`.
