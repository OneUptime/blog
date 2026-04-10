# Validation Summary: How to Configure Alerting via Email for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (distributed storage orchestrator for Kubernetes)
- Prometheus Alertmanager (alert routing and notification)
- Prometheus Operator AlertmanagerConfig CRD (monitoring.coreos.com/v1alpha1)
- kube-prometheus-stack Helm chart
- Kubernetes Secrets
- SMTP email delivery

## Sources Consulted
- Prometheus Operator AlertmanagerConfig API types source code (`alertmanager_config_types.go`) — confirmed `headers` field is `[]KeyValue` (not a map), and `authPassword` is a `v1.SecretKeySelector` scoped to the same namespace as the AlertmanagerConfig resource.
- Prometheus Operator CRD documentation for `monitoring.coreos.com/v1alpha1` AlertmanagerConfig.
- Alertmanager official documentation for native configuration fields (`smtp_smarthost`, `smtp_from`, `smtp_auth_username`, `smtp_auth_password`, `smtp_require_tls`, `email_configs`, `send_resolved`).
- Alertmanager v2 API specification (`/api/v2/alerts` POST endpoint and payload format).
- kube-prometheus-stack Helm chart values documentation (`alertmanager.config` path).

## Issues Found

### 1. Secret namespace mismatch
- **What was wrong:** The `kubectl create secret` command created the SMTP credentials secret in the `monitoring` namespace (`-n monitoring`), but the `AlertmanagerConfig` CRD was deployed to the `rook-ceph` namespace. The `authPassword` field uses a `v1.SecretKeySelector` which is a local object reference — it can only reference secrets in the same namespace as the AlertmanagerConfig resource.
- **What was changed:** Changed `-n monitoring` to `-n rook-ceph` in the secret creation command.
- **Why:** Without this fix, the AlertmanagerConfig would fail to resolve the secret reference, and email authentication would not work.

### 2. Incorrect `headers` format in AlertmanagerConfig CRD
- **What was wrong:** The `headers` field in the `emailConfigs` section used a YAML map format (`Subject: '...'`), but the AlertmanagerConfig CRD defines `headers` as `[]KeyValue` — a list of objects with `key` and `value` fields.
- **What was changed:** Changed from map format to list-of-KeyValue format:
  ```yaml
  # Before (incorrect):
  headers:
    Subject: '[ROOK-CEPH] ...'

  # After (correct):
  headers:
  - key: Subject
    value: '[ROOK-CEPH] ...'
  ```
- **Why:** The map format would fail CRD schema validation when applied to the cluster.

## Review Notes
- The `AlertmanagerConfig` uses `apiVersion: monitoring.coreos.com/v1alpha1`. This is still a valid and widely-used API version, though `v1beta1` is also available in newer Prometheus Operator releases. The alpha API is not deprecated but users on newer operator versions may prefer `v1beta1`.
- The `default-email` receiver in the global SMTP configuration section has no `email_configs` defined, meaning it acts as a silent/no-op receiver. This is valid but worth noting — users should add email configuration if they want the default receiver to actually send emails.
- The Go template expression `{{ .Status | toUpper }}` is correct — `toUpper` is a registered template function in Alertmanager.
- The `ceph_cluster` label used in the custom email template may not be present on all Rook-Ceph alerts depending on the Rook version and configuration. Users should verify their alert labels before relying on this in production templates.
