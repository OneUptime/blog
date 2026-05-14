# Validation Summary: How to Handle Flux CD Controller Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux controllers and Flux CLI
- Kubernetes Deployments, PodDisruptionBudgets, CronJobs, RBAC, probes, and field selectors
- Prometheus Operator PrometheusRule
- Kustomize patches
- Slack notifications with Flux notification-controller

## Sources Consulted
- Flux install command documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux check command documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux export command documentation: https://fluxcd.io/flux/cmd/flux_export/
- Flux HelmRelease reconcile documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux HelmRelease get documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux notification alerts documentation: https://fluxcd.io/flux/monitoring/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux controller options documentation: https://fluxcd.io/flux/components/source/options/
- Flux bootstrap customization documentation: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl wait/reference documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Current Flux install manifest from GitHub releases: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The Flux notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but the documented Alert and Provider examples use `v1beta3`. Updated both resources to `v1beta3`.
- The Slack provider referenced a webhook-style secret without an address. Updated the example to use the documented Slack API address and a token-style secret name.
- The reconciliation stalled alert used a raw counter equality check and referenced a non-existent `controller` label. Updated it to use `increase(gotk_reconcile_duration_seconds_count[15m])` and labels that exist on the Flux metric.
- The `flux install` example used an unsupported `--version` flag. Removed the flag and kept the documented `--components-extra` usage.
- The HA patch replaced controller args and used the invalid `--leader-elect=true` flag. Replaced it with a JSON patch that only scales replicas and adds topology spread constraints, relying on the documented/generated `--enable-leader-election` flag already present in Flux install manifests.
- The source-controller OOM check used an event reason that is not a reliable Kubernetes query for container termination state. Changed it to inspect pod container `lastState.terminated.reason`.
- The GitRepository example claimed to configure shallow clones but only used ignore rules. Updated it to describe sparse checkout and ignore rules, and added `sparseCheckout`.
- The HelmRelease troubleshooting command used an unsupported custom-resource field selector on `status.conditions[0].reason`. Replaced it with `flux get helmreleases -A --status-selector ready=false`.
- The notification-controller concurrency patch would have replaced the whole args list. Changed it to a JSON patch that appends `--concurrent=10`.
- The CronJob referenced a ServiceAccount without RBAC. Added the ServiceAccount, Role, and RoleBinding required to get and patch deployments.

## Review Notes
The CronJob-based auto-restart pattern is technically valid with the added RBAC, but it should be used carefully in production because automated restarts can mask recurring controller crashes. Prometheus and Flux notification alerts remain the better first-line operational signal.
