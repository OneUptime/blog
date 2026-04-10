# Validation Summary: How to Configure Alerting via PagerDuty for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (storage orchestration for Kubernetes)
- Prometheus / Alertmanager (monitoring and alerting)
- PagerDuty Events API v2 (incident management)
- Prometheus Operator AlertmanagerConfig CRD (monitoring.coreos.com/v1alpha1)
- kube-prometheus-stack Helm chart
- Kubernetes Secrets

## Sources Consulted
- Prometheus Operator API reference for AlertmanagerConfig CRD (`PagerDutyConfig` type, `routingKey` vs `serviceKey` fields, `details` as `[]KeyValue`)
- Alertmanager configuration documentation (native config format using snake_case: `pagerduty_configs`, `routing_key`, `service_key`)
- PagerDuty Events API v2 documentation (integration key usage, `https://events.pagerduty.com/v2/enqueue` endpoint)
- Alertmanager API v2 specification (`POST /api/v2/alerts` payload format)
- kube-prometheus-stack Helm chart values documentation (`alertmanager.config` uses native Alertmanager config format)

## Issues Found

1. **Secret created in wrong namespace**: The `kubectl create secret` command used `-n monitoring`, but the `AlertmanagerConfig` CRD is deployed in the `rook-ceph` namespace. Secret references in `AlertmanagerConfig` resolve from the same namespace as the CRD resource. Changed to `-n rook-ceph`.

2. **`serviceKey` used instead of `routingKey` in AlertmanagerConfig CRD**: The post instructs users to set up PagerDuty Events API v2, but the CRD used `serviceKey` which corresponds to Events API v1. Changed to `routingKey` in the CRD and updated the secret data key from `service_key` to `routing_key` for consistency.

3. **`details` field uses map format instead of `[]KeyValue` format**: In the Prometheus Operator's `AlertmanagerConfig` CRD, the `details` field in `PagerDutyConfig` is typed as `[]KeyValue` (a list of objects with `key` and `value` fields), not a map. Changed from map syntax to the correct list-of-objects format.

4. **Helm values use camelCase field names instead of snake_case**: The `alertmanager.config` section in kube-prometheus-stack Helm values passes native Alertmanager configuration, which uses snake_case. Changed `pagerdutyConfigs` to `pagerduty_configs`.

5. **Helm values use `serviceKey` instead of `routing_key`**: Since the global `pagerduty_url` is set to the Events API v2 endpoint, the correct native Alertmanager field is `routing_key`, not `serviceKey` (which is camelCase and for Events API v1). Changed to `routing_key`.

## Review Notes
- The test curl command for triggering a manual alert via the Alertmanager API v2 is correct and functional.
- The `AlertmanagerConfig` API version `monitoring.coreos.com/v1alpha1` is correct but is an alpha API. Users should check if their Prometheus Operator version also supports `v1beta1` or later.
- The Go template expressions used in `severity`, `description`, and `details` fields are valid Alertmanager template syntax.
