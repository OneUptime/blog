# Validation Summary: How to Create Automatic Rollback Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes readiness and liveness probes
- kubectl rollout commands
- Prometheus alerting rules and PromQL
- Prometheus Operator PrometheusRule resources
- Alertmanager routing and webhooks
- Python Flask webhook service
- GitHub Actions

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator PrometheusRule CRD reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_prometheusrules.yaml

## Issues Found
- The post implied Kubernetes can trigger rollbacks directly from probe failures. Kubernetes marks stalled Deployment progress with `ProgressDeadlineExceeded`; it does not automatically roll back without higher-level automation. Updated the wording to describe detection and CI/CD/controller-triggered rollback accurately.
- The Prometheus alert expressions used `sum(...)` aggregation, which removes the original metric labels. The rollback controller expects `app` and `namespace` labels from Alertmanager, so the alerts would have been skipped. Added explicit `app: api-service` and `namespace: production` labels to both rollback alert rules.
- The Alertmanager route used the deprecated `match` field. Updated it to the current `matchers` syntax.
- The decision flow said Kubernetes stops the rollout. Updated it to say Kubernetes marks the rollout failed, which matches Deployment status behavior.

## Review Notes
- The examples are valid as illustrative snippets, but a production rollback controller should also authenticate webhook requests, validate allowed deployment names and namespaces, run with narrowly scoped Kubernetes RBAC, and persist cooldown state outside process memory.
- The GitHub Actions example assumes the runner can reach Prometheus at `http://prometheus:9090` and has `kubectl`, `jq`, and `bc` available or installed by earlier workflow setup.
