# Validation Summary: How to Implement Multi-Region Deployments with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Kubernetes
- Kustomize
- Prometheus / Prometheus Operator
- Argo CD Notifications
- GitOps

## Sources Consulted
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_cluster_add/
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/

## Issues Found
- The RollingSync section did not mention that Progressive Syncs are experimental and must be explicitly enabled on the ApplicationSet controller. Added that caveat before the RollingSync example.
- The RollingSync ApplicationSet example included `syncPolicy.automated`, but Argo CD's RollingSync strategy forces generated Applications to have autosync disabled while it manages the rollout. Removed the automated sync policy from the RollingSync example and added a note explaining the behavior.
- The monitoring example used `argocd_app_health_status`, which is not an Argo CD application-controller metric. Replaced it with `argocd_app_info` using the documented `health_status` label.
- The monitoring example grouped alerts by `region`, but Argo CD only exposes custom Application labels through `argocd_app_labels` when enabled. Added a note about enabling the `region` label and updated the PromQL joins to use `argocd_app_labels{label_region!=""}`.
- The version drift alert grouped by a `revision` label on `argocd_app_info`, which is not documented for that metric. Changed the alert to detect regional sync drift using the documented `sync_status` label.

## Review Notes
The remaining examples are illustrative and assume existing projects, repositories, clusters, Slack notification configuration, webhook service configuration, and Prometheus scraping of Argo CD metrics. The declarative cluster Secret format and ApplicationSet cluster generator parameters match the official Argo CD documentation.
