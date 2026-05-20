# Validation Summary: How to Configure Orphaned Resource Warnings in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProjects and orphaned resource monitoring
- Argo CD Notifications
- Kubernetes resources and custom resources
- Prometheus and PromQL
- Grafana dashboard panels

## Sources Consulted
- Argo CD orphaned resources monitoring documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notifications services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Slack, Email, and Webhook notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/, https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD CLI command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD CLI command reference for `argocd proj add-orphaned-ignore`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_add-orphaned-ignore/
- Argo CD Application API source for `OrphanedResourceWarning`: https://raw.githubusercontent.com/argoproj/argo-cd/stable/pkg/apis/application/v1alpha1/types.go
- Expr language documentation used by Argo CD notification triggers: https://expr-lang.org/docs/v1.15/language-definition
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post said `warn: true` reports orphaned resources in project status. Argo CD documents orphaned-resource warnings as warnings on affected applications, and the API type exposes `OrphanedResourceWarning` as an Application condition. I changed the description to say Argo CD adds an `OrphanedResourceWarning` condition to affected applications.
- The notification trigger used `app.status.orphanedResources | length > 0`, which is not a documented Application status field and is not valid Expr syntax. I changed it to check Application conditions for `OrphanedResourceWarning` with Expr's `any()` function.
- The notification examples omitted the required subscription step. I added a minimal annotation example for subscribing an application or project to the trigger.
- The post described `argocd_app_orphaned_resources_count` as a project-total metric. Argo CD documents it as a gauge with orphaned resource count per application, with `project` and `name` labels. I changed project-level examples to aggregate with `sum by (project)` and adjusted the Grafana legend to include both project and application name.
- The PromQL growth alert used `increase()` on `argocd_app_orphaned_resources_count`, which is a gauge. Prometheus documents `increase()` for counters, so I changed the growth example to use `delta()` for the gauge.
- The development ignore example used `group: "*"` and `kind: "*"`. Argo CD documents name glob patterns for orphaned resource ignore rules, while group and kind are the resource identifiers. I changed the example to explicit `ConfigMap` and `Secret` ignore rules with a `dev-*` name glob.
- The standard ignore list included Kubernetes resources that Argo CD documents as never considered orphaned by default, or resources that are not appropriate examples of top-level orphaned resources. I narrowed the list to common noisy or generated resources and removed misleading entries.

## Review Notes
The core AppProject `spec.orphanedResources.warn` and `ignore` field names are current and valid. Argo CD notes that orphaned resource monitoring can have performance implications in broad namespaces, so future revisions could add a short caution about enabling it only for well-scoped projects.
