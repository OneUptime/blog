# Validation Summary: How to Audit Policy Compliance with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- Kyverno PolicyReports and metrics
- OPA Gatekeeper audit and metrics
- Prometheus and PrometheusRule
- Grafana dashboards
- Python requests
- jq

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Kyverno Policy Reports documentation: https://kyverno.io/docs/guides/reports/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- OPA Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- OPA Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- jq 1.7 local CLI syntax checks.

## Issues Found
- The fleet-wide sync percentage command divided by zero when there were no Argo CD applications. Added a guard so the example prints `0%` instead of failing.
- The Argo CD notification example used an undocumented `toJson` template helper and configured only a trigger/template/service, not a subscription. Replaced the payload with documented template fields and added a global webhook subscription for the `on-out-of-sync` trigger.
- The notification example labeled all `OutOfSync` events as drift, although Argo CD `OutOfSync` can also mean a pending Git change has not yet been applied. Renamed the emitted event and template to `out_of_sync_detected`.
- The Kyverno report summary labeled the number of report entries as `total_resources`. Changed it to `total_results`, which matches the PolicyReport data model.
- The Prometheus examples used `kyverno_policy_results_total`, but current Kyverno documentation names the metric `kyverno_policy_results`. Updated the dashboard and alert examples accordingly.
- The Prometheus and Grafana examples used `opa_constraint_violations`, but current Gatekeeper documentation exposes audit violations as `gatekeeper_violations`. Updated the queries and legend label to use the documented metric and `enforcement_action` label.

## Review Notes
- The Python example intentionally uses `verify=False`, which will work but is not appropriate for production unless TLS validation is handled elsewhere.
- Gatekeeper constraint status lists only the most recent audit results and may cap individual violations while still reporting `totalViolations`.
- Kyverno PolicyReports represent current report state only; they are not a historical audit log.
