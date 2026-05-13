# Validation Summary: How to Implement Drift Detection Alerts for Compliance with Flux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux notification-controller Provider and Alert APIs
- Flux CLI
- Kubernetes CronJob
- Kubernetes Events
- GitOps compliance workflows
- Slack and PagerDuty alert integrations

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux `diff kustomization` CLI reference: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux `get` CLI reference: https://fluxcd.io/flux/cmd/flux_get/
- Flux releases: https://github.com/fluxcd/flux2/releases
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- Corrected the description of Flux drift handling. `prune: true` controls garbage collection for previously applied resources that are removed from the current source revision; it is not what enables ordinary managed-resource drift correction.
- Corrected the `prune: false` explanation. It does not alert on arbitrary extra unmanaged resources; it leaves previously applied resources in place when they disappear from Git.
- Corrected the `force` explanation. Flux `force: true` allows recreation when immutable fields change, not general overwriting of fields managed by other controllers.
- Updated Flux notification `Provider` and `Alert` manifests from `notification.toolkit.fluxcd.io/v1` to the documented `notification.toolkit.fluxcd.io/v1beta3` API for Provider and Alert resources.
- Added required `name: '*'` selectors to Alert `eventSources`.
- Replaced deprecated Alert `summary` fields with `eventMetadata.summary`.
- Changed `eventSeverity: warning` to `eventSeverity: info`, because Flux notification alerts support `info` and `error`.
- Fixed the PagerDuty Provider example to use `address: https://events.pagerduty.com` and `channel: <integrationKey>`, matching the documented routing-key configuration.
- Removed the claim that a Flux Alert alone pages only after drift persists for more than 15 minutes; that duration-based behavior would require another alerting layer.
- Updated the Flux CLI container example from `v2.4.0` to the current Flux release line, `v2.8.6`.
- Updated the `flux diff` CronJob to check the documented exit code instead of grepping output text, and avoided embedding unescaped multi-line diff output into JSON.
- Replaced `flux get kustomizations --all-namespaces | grep -v Ready` with `flux get kustomizations --all-namespaces --status-selector ready=false`.
- Made the Kubernetes events report more robust for current event fields by using `.eventTime // .lastTimestamp // .metadata.creationTimestamp` and `.regarding.name // .involvedObject.name`.
- Fixed malformed Markdown code fences in the runbook and later code blocks.

## Review Notes
The examples still assume the CronJob service account has RBAC to read Flux Kustomizations and run server-side dry-run diff operations. That is operationally necessary but outside the snippet's scope.
