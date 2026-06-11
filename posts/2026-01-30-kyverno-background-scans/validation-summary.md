# Validation Summary: How to Build Kyverno Background Scans

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kyverno
- Kubernetes
- PolicyReport and ClusterPolicyReport
- Helm
- Prometheus metrics and ServiceMonitor
- kubectl and jq

## Sources Consulted
- Kyverno Policy Reports documentation: https://kyverno.io/docs/guides/reports/
- Kyverno installation customization and controller flags: https://kyverno.io/docs/installation/customization/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy type overview and deprecation schedule: https://kyverno.io/docs/policy-types/overview/
- Kyverno monitoring guide: https://kyverno.io/docs/guides/monitoring/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- Kyverno installation and high availability documentation: https://kyverno.io/docs/installation/installation/ and https://kyverno.io/docs/guides/high-availability/
- Kyverno Helm chart values and templates: https://github.com/kyverno/kyverno/tree/main/charts/kyverno
- Kyverno sample policies for runAsNonRoot, hostPath, privileged containers, and host namespaces: https://kyverno.io/policies/

## Issues Found
- The post used deprecated `spec.validationFailureAction` in policy examples. Updated examples to use rule-level `validate.failureAction`.
- The post claimed audit-mode policies only work with background scanning enabled. Corrected this to clarify that background scanning records existing-resource results without blocking them.
- The scan interval examples used a Kyverno ConfigMap and deployment restart. Current Kyverno documents background scan settings as reports-controller flags, commonly configured through Helm values, so the examples now use `features.backgroundScan`.
- The workflow diagram named the background controller as the scanner. Kyverno documentation states background scans are handled by the reports controller, so the diagram now uses the reports controller.
- The label-filtered PCI example claimed to validate encrypted volumes but checked `emptyDir`. Replaced it with a hostPath restriction pattern from Kyverno policy examples.
- The Prometheus examples used non-existent metric names such as `kyverno_policy_results_total` and `kyverno_background_scan_duration_seconds`. Replaced them with documented `kyverno_policy_results` and `kyverno_policy_execution_duration_seconds_bucket` queries scoped to background scans.
- The webhook notification section implied Kyverno policies directly trigger webhooks. Changed it to severity metadata for downstream alerting tools.
- The performance tuning examples used unsupported environment variables and a single Kyverno deployment. Replaced them with Helm values for `reportsController.resources`, `reportsController.replicas`, and `features.backgroundScan.backgroundScanWorkers`.
- The troubleshooting commands targeted the wrong deployment and unsupported ConfigMap/env-var settings. Updated them to use `kyverno-reports-controller` and Helm value changes.
- Several security examples required fields to exist even though their messages said unset values were allowed. Updated the runAsNonRoot, privileged container, hostNetwork, and hostPID patterns to match Kyverno policy-library behavior.

## Review Notes
Kyverno 1.18 marks legacy `ClusterPolicy` as deprecated, with removal planned in a future release, but Kyverno's current background-scan documentation still documents `Policy` and `ClusterPolicy` behavior for policy reports. A future update should consider rewriting the examples to the newer `ValidatingPolicy` API once the blog targets Kyverno 1.18+ explicitly.
