# Validation Summary: How to Set Up ArgoCD on AKS for Declarative GitOps Continuous Delivery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Argo CD
- GitOps
- Kubernetes
- Helm
- Argo CD CLI
- Argo CD Notifications
- Slack notifications

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD declarative repository setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD CLI login command reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/commands/argocd_login/
- Argo CD app set command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set
- Argo CD notifications triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications Slack service: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/slack/
- Argo CD notifications services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Helm chart README: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/

## Issues Found
- The Helm command was labeled as an HA configuration but did not enable Redis HA or ApplicationSet replicas, and it scaled the application controller to two replicas. Updated the values to match the official Helm chart HA example without autoscaling.
- The Argo CD CLI login example used `--insecure` while the server was configured with `server.insecure=true`, which disables TLS on the server. Updated the command to use `--plaintext`.
- The Application YAML comment incorrectly said `selfHeal` creates namespaces. Updated the comment to describe live drift correction; namespace creation remains covered by `CreateNamespace=true`.
- The polling description implied a fixed 3-minute loop. Updated it to say Argo CD runs reconciliation within 3 minutes by default.
- The Slack notifications example referenced `$slack-token` without creating the expected notifications secret, and used `OutOfSync` as a sync failure trigger. Added the secret, corrected the success/failure trigger conditions, and added subscription annotations so notifications are actually sent.
- The rollback command was shown against an auto-syncing application. Added a command to disable automated sync before using `argocd app rollback`.

## Review Notes
The guide is technically sound after the fixes. For a production-ready AKS deployment, future improvements could include Azure-specific ingress/TLS examples, SSO configuration details, and workload identity or Azure Key Vault integration examples.
