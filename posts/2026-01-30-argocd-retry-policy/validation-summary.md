# Validation Summary: How to Build ArgoCD Retry Policy

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Argo CD Applications and automated sync retry policies
- Argo CD ApplicationSets
- Kubernetes manifests and sync wave annotations
- Prometheus alerting rules
- Argo CD Notifications
- Argo CD CLI

## Sources Consulted
- Argo CD Automated Sync Policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD ApplicationSet List Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet Template and Template Patch documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Notifications troubleshooting documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/troubleshooting/

## Issues Found
- Fixed the retry backoff formula explanation to state that `attempt` starts at 0 for the first retry, matching the documented exponential backoff behavior and the example sequence.
- Fixed the ApplicationSet example. The original snippet templated `retry.limit` as a quoted string inside `spec.template`, but `retry.limit` is an integer field and Go templates are only applied to string fields. The corrected version enables Go templating and uses `templatePatch` to render the integer retry limit and per-environment max duration.
- Corrected the sync waves explanation. Retry policies apply to the sync operation, not independently to each wave. The text now explains that Argo CD re-evaluates ordered waves on retry and starts with the first wave still out-of-sync or unhealthy.
- Fixed invalid Mermaid sequence diagram participant identifiers that contained spaces and a hyphen while preserving the displayed labels.
- Corrected the Prometheus metric `argocd_app_reconcile_count` to the documented `argocd_app_reconcile` histogram and adjusted the metric descriptions.
- Adjusted the Prometheus alert wording from "exceeds retry limits" to "repeated failed syncs" because the example query detects repeated failures, not an explicit retry-exhausted metric.
- Corrected the CLI comment for `argocd app sync myapp --force`. The `--force` flag uses force apply; it does not specifically mean "ignore retry state."

## Review Notes
The retry configuration fields, sync options, notification subscription annotation format, and `argocd app sync` retry flags were checked against current official Argo CD documentation and are technically valid after the fixes above.
