# Validation Summary: How to Use Notification Subscriptions with Annotations in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Argo CD Applications and AppProjects
- Argo CD ApplicationSets
- Kubernetes annotations
- Kustomize
- Helm templates
- kubectl
- jq

## Sources Consulted
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification triggers and default triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications overview and namespace-based configuration notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD PagerDuty V2 notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Helm template whitespace control documentation: https://helm.sh/docs/chart_template_guide/control_structures/

## Issues Found
- The introduction stated that ArgoCD notification subscriptions are driven entirely by annotations. Argo CD also supports centrally managed subscriptions in `argocd-notifications-cm`, so this was changed to say subscriptions can be driven by annotations.
- The annotation model section said every notification subscription is expressed as an annotation. This was narrowed to every annotation-based notification subscription, matching the documented Application/AppProject annotation model.
- PagerDuty examples used `pagerduty` with an empty recipient. Current Argo CD documentation describes PagerDuty V2 as `pagerdutyv2` with a service recipient, so the examples now use `pagerdutyv2: my-service`.
- The Helm template used left-trimming range directives indented under `annotations:`, which can produce invalid YAML by consuming significant whitespace. The range directives were moved to column zero while leaving rendered annotation keys correctly indented.
- The command for removing all notification annotations assumed `.metadata.annotations` was always present and matched any annotation beginning with `notifications`. It now defaults missing annotations to `{}` and only removes keys beginning with `notifications.argoproj.io/subscribe`.

## Review Notes
The examples assume the named triggers such as `on-deployed` exist in `argocd-notifications-cm` or the installed notification catalog. This is technically valid but should remain clear to readers because custom trigger names must be configured before subscriptions using them will send notifications.
