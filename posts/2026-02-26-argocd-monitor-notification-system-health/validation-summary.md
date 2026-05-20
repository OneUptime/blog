# Validation Summary: How to Monitor Notification System Health in ArgoCD

## Status
validated

## Post Type
Tutorial / operational monitoring guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes Deployments, Services, probes, and annotations
- Prometheus, Prometheus Operator ServiceMonitor, and PrometheusRule
- PromQL
- Grafana dashboards
- Loki LogQL
- jq and kubectl

## Sources Consulted
- Argo CD Notifications monitoring documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/monitoring/
- Argo CD Prometheus Operator metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD notification subscription documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD upstream install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo Helm chart README for notifications metrics and probes: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Kubernetes liveness/readiness/startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Grafana Loki metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Referenced OneUptime related post URL checked: https://oneuptime.com/blog/post/2026-02-26-argocd-debug-notification-delivery-failures/view

## Issues Found
- The ServiceMonitor selector used `app.kubernetes.io/component: notifications-controller`, but Argo CD's documented ServiceMonitor example and current metrics Service use `app.kubernetes.io/name: argocd-notifications-controller-metrics`. Updated the selector and Service labels so Prometheus Operator can match the metrics Service.
- The metrics Service selected pods with `app.kubernetes.io/component: notifications-controller`, but the current upstream notifications-controller pod template is selected by `app.kubernetes.io/name: argocd-notifications-controller`. Updated the Service selector accordingly.
- The metrics Service used `targetPort: metrics`, which depends on a named container port. The upstream manifest uses numeric `targetPort: 9001`, so the snippet now uses the numeric port and does not require a container port name to resolve.
- The post described `argocd_notifications_trigger_eval_total` labels as `trigger` and `result`. Official Argo CD docs list the labels as `name` and `triggered`. Updated the metric description, recording rule, and Grafana panel query/legend.
- The health probe example used HTTP GET `/healthz` on port 9001. Current upstream Argo CD manifests use a TCP socket liveness probe for the notifications controller metrics port, and the Helm chart exposes configurable probes rather than documenting an HTTP `/healthz` endpoint for this controller. Updated the example probes to `tcpSocket`.
- The jq command for finding subscribed applications with no notification state could error when an Application has no annotations. Updated it to use `(.metadata.annotations // {})`.

## Review Notes
The remaining examples are technically plausible, but alert label values such as `job="argocd-notifications-controller-metrics"` can vary by Prometheus Operator and ServiceMonitor configuration. Operators should confirm the actual `job` label in their Prometheus targets before relying on that alert unchanged.
