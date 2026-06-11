# Validation Summary: How to Implement Kyverno Policy Reports

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kyverno
- Kubernetes PolicyReport and ClusterPolicyReport CRDs
- Kubernetes RBAC and CronJob resources
- Helm
- Policy Reporter
- Prometheus, Prometheus Operator, and PrometheusRule resources
- Grafana
- Slack, Microsoft Teams, and S3 alert/report targets

## Sources Consulted
- Kyverno Policy Reports documentation: https://kyverno.io/docs/guides/reports/
- Kyverno installation customization documentation: https://kyverno.io/docs/installation/customization/
- Kyverno Helm chart values and README: https://github.com/kyverno/kyverno/tree/main/charts/kyverno
- Kyverno CRD schemas for deprecated `validationFailureAction`: https://github.com/kyverno/kyverno/tree/main/config/crds
- Policy Reporter Helm chart documentation: https://kyverno.github.io/policy-reporter-docs/getting-started/helm.html
- Policy Reporter chart values and README: https://github.com/kyverno/policy-reporter/tree/main/charts/policy-reporter
- Policy Reporter target documentation: https://kyverno.github.io/policy-reporter/core/targets/
- Policy Reporter metrics source and dashboard templates: https://github.com/kyverno/policy-reporter

## Issues Found
- Kyverno report scope was described as namespace-wide and cluster-policy-wide. Updated the descriptions and examples to reflect current Kyverno behavior: `PolicyReport` is for namespaced resources and `ClusterPolicyReport` is for cluster-scoped resources.
- The `ClusterPolicyReport` example used a namespaced Pod. Changed it to a cluster-scoped Namespace example.
- The Helm values under report history used invalid/stale keys (`reportChunkSize`, `generateReports`). Replaced them with current `features.backgroundScan` and `features.reporting` values.
- The forced rescan example used a non-documented policy annotation and restarted the wrong deployment. Replaced it with a reports-controller restart example.
- The Policy Reporter install command used the stale `kyvernoPlugin.enabled` value. Updated it to `plugin.kyverno.enabled` and enabled metrics explicitly.
- The metrics examples and PromQL used `policy_report_summary`, which Policy Reporter no longer emits in current detailed/simple/custom modes. Replaced those references with `policy_report_result`.
- The ServiceMonitor section did not show the current chart-supported `monitoring.enabled` path. Added the Helm values and kept the manual ServiceMonitor option.
- Policy Reporter target configuration used old field names such as `minimumPriority` and `accessKeyID`. Updated them to current fields such as `minimumSeverity`, `sources`, `status`, `severities`, and `accessKeyId`.
- Sample Kyverno policies used deprecated top-level `spec.validationFailureAction`. Moved this to rule-level `validate.failureAction`.
- The compliance CronJob used `jq` with a `bitnami/kubectl` image, which would not reliably include `jq`. Rewrote the script to use `kubectl` go-templates and `awk`.
- Troubleshooting logs targeted an old generic Kyverno component label. Updated it to `app.kubernetes.io/component=reports-controller`.
- The best-practice note about report retention implied PolicyReports are historical records. Updated it to clarify they represent current cluster state and external storage is needed for audit trails.

## Review Notes
Kyverno 1.15 adds alpha OpenReports support with `openreports.io/v1alpha1` as an alternative to the default `wgpolicyk8s.io/v1alpha2` reports. The post remains valid for default `wgpolicyk8s` reports, but future updates may need to cover OpenReports as it matures.
