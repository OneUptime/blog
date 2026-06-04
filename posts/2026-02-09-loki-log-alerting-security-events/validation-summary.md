# Validation Summary: How to Use Loki Log-Based Alerting Rules for Kubernetes Security Event Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Loki ruler alerting rules
- Kubernetes audit logs
- kubectl
- Prometheus Alertmanager

## Sources Consulted
- Grafana Loki configuration parameters: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki alerting and recording rules: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki LogQL and log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The Loki storage example used BoltDB Shipper with schema v11 for a new deployment. Updated it to TSDB with schema v13 and `tsdb_shipper`, matching current Loki recommendations for new installs.
- The Loki single-process configuration used an older `ingester.lifecycler.ring` layout. Replaced it with the current `common.ring`, `common.replication_factor`, and `common.path_prefix` pattern used in official Loki examples.
- The local ruler rules mount placed the rules file directly under `/etc/loki/rules`. Loki local ruler storage expects `/etc/loki/rules/<tenant id>/...`; for single-tenant Loki, the tenant ID is `fake`. Added ConfigMap volume `items` to mount the file as `fake/security-rules.yaml`.
- The `KernelModuleLoaded` alert grouped by and referenced a `module` label that the query never extracted. Removed that grouping label and adjusted the annotation.
- Kubernetes audit log rules grouped by labels such as `user`, `namespace`, `secret_name`, `role_name`, and `pod`, but Loki's JSON parser flattens nested Kubernetes audit fields into labels such as `user_username`, `objectRef_namespace`, and `objectRef_name`. Updated groupings and annotations accordingly.
- The privileged RBAC rule attempted to regex-match `requestObject` as an extracted label after JSON parsing. Moved the `pods/exec` match to a line regex before the JSON parser so it can match the raw audit event reliably.
- The test command used the `nginx` image to run `curl`, which would not work as written. Updated it to use `curlimages/curl` with `--command`.
- The privilege escalation test command depended on a deleted/nonexistent pod and assumed `sudo` existed in the container. Replaced it with a BusyBox pod that emits a matching test log line.
- The Alertmanager route used the older `match` map. Updated it to `matchers`, which is the current Alertmanager route syntax.

## Review Notes
The rules are syntactically aligned with LogQL and Prometheus-style alert rule structure, but many detections still depend on log producers emitting JSON fields such as `status_code`, `source_ip`, `destination`, `file_path`, and `level`. In a real cluster, those field names should be adjusted to match the organization's actual application, ingress, runtime, and audit log schemas.
