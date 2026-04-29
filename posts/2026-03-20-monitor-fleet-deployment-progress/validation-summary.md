# Validation Summary: How to Monitor Fleet Deployment Progress - Monitor

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rancher Fleet (GitOps controller)
- Kubernetes / kubectl
- Prometheus / Prometheus Operator (ServiceMonitor, PrometheusRule)
- Rancher UI (Continuous Delivery)
- Fleet custom resources: GitRepo, Bundle, BundleDeployment
- jq

## Sources Consulted
- [Fleet Observability docs](https://fleet.rancher.io/how-tos-for-users/observability)
- [Fleet GitRepo Resource reference](https://fleet.rancher.io/reference/ref-gitrepo)
- [Fleet Custom Resources Spec](https://fleet.rancher.io/reference/ref-crds)
- [Fleet metrics source — gitrepo_metrics.go](https://github.com/rancher/fleet/blob/main/internal/metrics/gitrepo_metrics.go)
- [Fleet metrics source — bundle_metrics.go](https://github.com/rancher/fleet/blob/main/internal/metrics/bundle_metrics.go)
- [Fleet metrics source — bundledeployment_metrics.go](https://github.com/rancher/fleet/blob/main/internal/metrics/bundledeployment_metrics.go)
- [Fleet CLI install/usage docs](https://fleet.rancher.io/how-tos-for-users/install-use-fleet-cli)
- [Rancher Fleet GitHub repository](https://github.com/rancher/fleet)

## Issues Found

1. **Fictional metric `fleet_gitrepo_state`** (Step 4 — Prometheus Metrics, and Step 5 — Alerts).
   - Fleet does not export a `fleet_gitrepo_state` metric. The actual GitRepo metrics live in `internal/metrics/gitrepo_metrics.go` and use names such as `fleet_gitrepo_desired_ready_clusters`, `fleet_gitrepo_ready_clusters`, `fleet_gitrepo_resources_desired_ready`, and `fleet_gitrepo_resources_ready`.
   - Replaced the example metrics block with the real metric names and updated the `FleetGitRepoNotReady` alert expression to compare desired vs. ready clusters: `fleet_gitrepo_desired_ready_clusters - fleet_gitrepo_ready_clusters > 0`.

2. **Incorrect `fleet_bundledeployment_state` semantics** (Step 4 and Step 5).
   - `fleet_bundledeployment_state` is keyed by a `state` label and emits `1` when the bundle deployment is currently in that state, not a binary ready/error indicator. The label `cluster` does not exist; the actual label is `cluster_name`.
   - Updated the example metric line to include the `state` label and clarified semantics. Updated the `FleetBundleDeploymentFailed` alert to filter on `state="ErrApplied"` and to reference `{{ $labels.cluster_name }}`.

3. **Non-existent `kubectl fleet` plugin / `fleetcontrol` CLI** (Step 6).
   - There is no `kubectl fleet` plugin and no tool named `fleetcontrol`. Rancher Fleet ships a standalone `fleet` CLI for `fleet apply` / `fleet target` (bundle authoring), not for fetching deployment status.
   - Replaced the bogus `kubectl fleet status` invocation with a `kubectl get bundledeployments -A` rollup using `-o custom-columns` for cluster/bundle/ready status, which works against the real Fleet CRDs.

4. **Wrong force re-sync mechanism** (Step 6).
   - The annotation `fleet.cattle.io/force-update` is not a documented Fleet trigger. The supported mechanism is to bump `spec.forceSyncGeneration` on the GitRepo, per the GitRepo CRD reference.
   - Replaced the `kubectl annotate ... fleet.cattle.io/force-update=...` command with a `kubectl patch ... -p '{"spec":{"forceSyncGeneration":'$(date +%s)'}}'` command and renamed the section heading to "Automation and Forced Re-sync" since it no longer covers a CLI tool.

## Review Notes
- The Fleet resource hierarchy (`GitRepo` → `Bundle` → `BundleDeployment` → application resources), the kubectl inspection commands, the GitRepo conditions (`Ready`, `Stalled`, `Modified`), and the Rancher UI navigation under Continuous Delivery are all consistent with current Fleet documentation.
- The ServiceMonitor example is correct: `cattle-fleet-system` namespace, `app: fleet-controller` selector, port `metrics`, 30s scrape interval. Note that Prometheus Operator users may also need a matching `release: monitoring` label to be discovered, and Fleet additionally exposes a `monitoring-gitjob` service on port `8081` if scraping git-job metrics is desired — this is a future improvement, not a correction.
- Status display strings in the Rancher UI come from Fleet's bundle states (`Ready`, `NotReady`, `WaitApplied`, `ErrApplied`, `OutOfSync`, `Modified`, `Pending`); the post's prose uses friendly forms ("Active", "Err Applied"), which match what users see in the UI even though the underlying state names are camelCase.
