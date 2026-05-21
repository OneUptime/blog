# Validation Summary: How to Set Up Alerts for Degraded ArgoCD Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Alertmanager
- PagerDuty and Slack alert routing
- kubectl

## Sources Consulted
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The original health explanation said any unhealthy resource makes the whole application Degraded. Argo CD application health is based on tracked immediate child resources and uses the worst child health status, so the wording was narrowed to immediate child resources.
- The original example implied a Deployment becomes Degraded directly because a child Pod is in CrashLoopBackOff. Argo CD does not generally infer parent health from child resources directly, so the diagram was changed to use `ProgressDeadlineExceeded` on the Deployment.
- The Alertmanager routing example used deprecated `match` blocks. These were changed to current `matchers` entries.
- The PagerDuty examples used `service_key`. They were changed to `routing_key`, which matches Alertmanager's current Events API v2 configuration.
- The investigation workflow used `argocd app resources my-app --health-status Degraded`, but `--health-status` is not a supported flag. It was replaced with `argocd app resources my-app --output tree=detailed`, which shows resource health and reason columns.
- The `argocd:degraded_by_namespace` recording rule used `or vector(0)`, which would add an unlabeled zero series rather than a per-namespace zero. It was removed so the rule accurately records counts by `dest_namespace`.

## Review Notes
The Prometheus expressions and PrometheusRule structure are valid for the documented metrics. The local environment did not have `argocd`, `kubectl`, `promtool`, `amtool`, or Ruby installed, so CLI and configuration validation was done against official documentation rather than local command output.
