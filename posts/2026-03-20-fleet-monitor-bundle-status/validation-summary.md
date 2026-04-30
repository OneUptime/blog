# Validation Summary: How to Monitor Fleet Bundle Status

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- `kubectl`
- Prometheus Operator
- Prometheus

## Sources Consulted
- Fleet Status Fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Rancher Fleet overview and UI navigation: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Prometheus Operator design docs: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Fleet source for bundle metrics: https://github.com/rancher/fleet/blob/main/internal/metrics/bundle_metrics.go
- Fleet source for GitRepo metrics: https://github.com/rancher/fleet/blob/main/internal/metrics/gitrepo_metrics.go
- Fleet source for BundleDeployment status fields: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go
- Fleet Helm chart service template for metrics: https://github.com/rancher/fleet/blob/main/charts/fleet/templates/service.yaml

## Issues Found
- Commands piping `kubectl -o jsonpath=...` into `python3 -m json.tool` were unreliable for object and array outputs. I changed them to `-o jsonpath-as-json=...`, which is the correct current `kubectl` output mode for JSON-formatted JSONPath results.
- The post described `Bundle.status.display` as a per-target list. Fleet documents `status.display` as a summary object, so I corrected the description while keeping the command.
- The BundleDeployment example used `.status.modified`, which is not a current Fleet status field. I replaced it with `.status.display.state`, which is defined and directly useful for per-cluster status output.
- The health-check script relied on a JSONPath numeric comparison filter and looked for `reason=FailedSync` events sorted by `.lastTimestamp`. I changed the non-ready bundle filter to a portable `awk` post-filter and updated the events query to use supported warning-event filtering with `.metadata.creationTimestamp`.
- The Prometheus metrics list referenced incorrect or non-current Fleet metric names (`fleet_cluster_ready`, `fleet_gitrepo_sync_latency`, `fleet_gitrepo_sync_error`). I replaced them with current bundle metrics exported by Fleet.
- The `FleetBundleNotReady` alert expression returned the desired-ready value rather than the count of unready bundle deployments. I changed it to `(fleet_bundle_desired_ready - fleet_bundle_ready) > 0` so the alert value matches the description.
- The PrometheusRule example had no selector label even though the ServiceMonitor example already warned about operator selectors. I added a matching label comment and label to keep the example consistent with common Prometheus Operator setups.

## Review Notes
GitRepo-specific Prometheus metrics are exposed separately from the `gitjob` metrics service in Fleet upstream. This post now keeps the Prometheus examples bundle-focused, which matches the article title and the single `fleet-controller` scrape example.
