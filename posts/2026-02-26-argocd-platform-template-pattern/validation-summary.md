# Validation Summary: How to Implement the Platform Template Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- GitOps
- Helm charts and templates
- Kubernetes namespaces, RBAC, ResourceQuota, and NetworkPolicy
- Prometheus Operator ServiceMonitor and PrometheusRule
- PromQL alert expressions
- Git tags for template versioning

## Sources Consulted
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Helm template functions documentation: https://helm.sh/docs/chart_template_guide/functions_and_pipelines/
- Prometheus Operator getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The service config path in the introductory example did not match the ApplicationSet Git file generator glob. Changed it from `team-config/services/payment-service.yaml` to `team-config/services/payment-service/config.yaml`.
- The ApplicationSet example used Go template expressions and Sprig-style functions without enabling Go templating. Added `goTemplate: true` and `goTemplateOptions: ["missingkey=error"]`.
- The ApplicationSet example attempted to parse a nonexistent raw `.config` object with `fromJson`. Argo CD's Git file generator flattens YAML/JSON file fields into template parameters, so the example now uses `.name`, `.team`, `.template`, `.path.path`, and `.path.filename`.
- The external Helm values path in the ApplicationSet example did not reliably reference the discovered config file. Updated it to `$values/{{ .path.path }}/{{ .path.filename }}` to match the Git file generator output and Argo CD multiple-sources value file behavior.
- The Prometheus high error rate expression divided unaggregated vectors, which would not compute the intended overall 5xx error ratio. Updated it to divide `sum(rate(...5xx...))` by `sum(rate(...all...))`.
- The Prometheus latency expression used `histogram_quantile` without aggregating classic histogram buckets by `le`. Updated it to use `sum by (le) (rate(..._bucket[5m]))`.
- The template version update snippet used singular `source` even though the post's Argo CD examples use `sources`. Updated the snippet to show `sources`.

## Review Notes
- The Kubernetes RBAC, ResourceQuota, NetworkPolicy, Namespace, and Prometheus Operator resource kinds use current API groups and versions.
- The NetworkPolicy DNS egress example is functional but broad because `namespaceSelector: {}` allows port 53 traffic to all namespaces. A production template may want a narrower selector for the cluster DNS namespace and pods.
- ApplicationSets with a templated `project` field should be controlled through an admin-reviewed source repository, as Argo CD documents this as a security-sensitive pattern.
