# Validation Summary: How to Deploy ArgoCD with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Kubernetes
- Helm
- Argo CD
- Argo CD Application, AppProject, and ApplicationSet CRDs
- Argo CD Notifications
- OIDC SSO and RBAC
- Git and Helm repository credentials

## Sources Consulted
- Argo Helm chart repository and chart index: https://argoproj.github.io/argo-helm/
- Argo CD Helm chart values for argo-cd 9.5.15: https://raw.githubusercontent.com/argoproj/argo-helm/argo-cd-9.5.15/charts/argo-cd/values.yaml
- Argo CD Helm chart metadata for argo-cd 9.5.15: https://raw.githubusercontent.com/argoproj/argo-helm/argo-cd-9.5.15/charts/argo-cd/Chart.yaml
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD notifications service overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD getting started documentation for initial admin password behavior: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Terraform bcrypt function documentation: https://developer.hashicorp.com/terraform/language/functions/bcrypt
- Terraform bcrypt provider resource documentation: https://registry.terraform.io/providers/viktorradnai/bcrypt/latest/docs/resources/hash

## Issues Found
- The Helm chart version was outdated. The post pinned `argo-cd` chart `5.55.0`, which installs Argo CD `v2.10.0`; updated it to chart `9.5.15`, which is current as of this review and installs Argo CD `v3.4.2`.
- The ingress example mixed TLS passthrough with `--insecure`. Since `--insecure` makes Argo CD serve HTTP behind the ingress while TLS is terminated at the ingress controller, removed `nginx.ingress.kubernetes.io/ssl-passthrough` and changed the backend protocol annotation to `HTTP`.
- The admin password example attempted to create `argocd-secret` as a separate `kubernetes_secret` after Helm installed Argo CD. That would conflict with the Helm-managed secret and could omit other required keys. Replaced it with the chart-supported `configs.secret.argocdServerAdminPassword` and `configs.secret.argocdServerAdminPasswordMtime` values.
- The sync window cron used `0 8-18 * * 1-5` with a 10-hour duration, which would create overlapping allow windows rather than only business hours. Changed it to start once at 08:00 on weekdays with a 10-hour duration.
- The notifications example referenced `$slack-token` but did not create the `argocd-notifications-secret` key that Argo CD notifications expects for sensitive service values. Added a Terraform-managed Kubernetes Secret manifest and made the notification ConfigMap depend on it.
- The notifications triggers read `app.status.operationState.phase` directly. Argo CD documents `status.operationState` as optional in trigger expressions, so changed the conditions to use `app.status?.operationState.phase`.

## Review Notes
- The updated `argo-cd` chart `9.5.15` declares `kubeVersion: >=1.25.0-0`, so clusters older than Kubernetes 1.25 need an older chart line or a Kubernetes upgrade.
- The ApplicationSet example uses the default fasttemplate syntax accepted by ApplicationSet, but Argo CD documentation indicates fasttemplate is being deprecated in favor of Go templates.
