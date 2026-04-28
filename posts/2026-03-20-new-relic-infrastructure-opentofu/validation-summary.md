# Validation Summary: How to Deploy New Relic Infrastructure with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- New Relic (Infrastructure agent, APM, Logs, Prometheus integration)
- Kubernetes
- Helm (`nri-bundle` chart)
- New Relic Terraform provider (`newrelic/newrelic`)
- Kubernetes provider (`kubernetes_secret`)
- Helm provider (`helm_release`)

## Sources Consulted
- [nri-bundle Helm chart - GitHub](https://github.com/newrelic/helm-charts/tree/master/charts/nri-bundle)
- [nri-bundle release 5.0.33 on newreleases.io](https://newreleases.io/project/github/newrelic/helm-charts/release/nri-bundle-5.0.33)
- [newrelic-infrastructure values.yaml (nri-kubernetes)](https://github.com/newrelic/nri-kubernetes/blob/main/charts/newrelic-infrastructure/values.yaml)
- [nri-prometheus chart values.yaml](https://github.com/newrelic/nri-prometheus/blob/main/charts/nri-prometheus/values.yaml)
- [Terraform Registry - newrelic_nrql_alert_condition](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/nrql_alert_condition)
- [Terraform Registry - newrelic_alert_policy](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/alert_policy)
- [Terraform Registry - newrelic_notification_channel](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/notification_channel)
- [Terraform Registry - newrelic_workflow](https://registry.terraform.io/providers/newrelic/newrelic/latest/docs/resources/workflow)
- [terraform-provider-newrelic releases](https://github.com/newrelic/terraform-provider-newrelic/releases)

## Issues Found

1. **Invalid `cluster_name` key inside `nri-prometheus.config`**
   - The `nri-prometheus` chart does not expose a `cluster_name` key inside its `config` block. Its top-level key is `cluster`, and that value is already propagated from `global.cluster` (which is set in the same `values` block).
   - **Fix:** removed the `cluster_name = var.cluster_name` line from `nri-prometheus.config`. Cluster identity continues to flow from `global.cluster`.

2. **Incorrect type for `kubelet.config.timeout`**
   - The `newrelic-infrastructure` chart parses `kubelet.config.timeout` as a Go duration string (default `"10s"`). Passing a bare integer (`30`) causes the chart to fail to parse the duration.
   - **Fix:** changed `timeout = 30` to `timeout = "30s"`.

## Review Notes
- The `newrelic_notification_channel` resource references `newrelic_notification_destination.slack.id`, but the matching `newrelic_notification_destination` resource is not defined in the snippet shown. Readers must define a destination separately for the channel to apply. The post otherwise correctly uses the modern `newrelic_notification_channel` resource (which replaces the deprecated `newrelic_alert_channel`) with `product = "IINT"` as required for use with workflows.
- The standalone `kubernetes_secret "newrelic"` resource is created but is not wired into the Helm release (e.g. via `global.customSecretName` / `global.customSecretLicenseKey`); the Helm chart will still create and manage its own license-key secret based on `global.licenseKey`. This is harmless but redundant — readers wanting a Terraform-managed secret should also set `customSecretName` on the release.
- The `kubernetes_secret` is created in the `newrelic` namespace but the namespace itself is created by the Helm release (`create_namespace = true`). In practice readers will need to ensure the namespace exists first (e.g. via a `kubernetes_namespace` resource or `depends_on`) for an end-to-end apply.
- `nri-bundle` 5.0.33 (October 2023) is a real release, but newer minor/patch releases (5.0.93+) and a 6.x line exist. The pinned version still works; readers may wish to consult the chart releases for the latest.
- `terraform-provider-newrelic ~> 3.0` is current — latest is in the 3.85.x range as of April 2026.
- The NRQL alert condition uses `threshold_occurrences = "ALL"`, which is valid (the field is case-insensitive and accepts `ALL` / `AT_LEAST_ONCE`). `incident_preference = "PER_CONDITION_AND_TARGET"` is also valid.
