# Validation Summary: How to implement Vault audit logging on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault audit devices
- Vault Helm chart on Kubernetes
- Kubernetes PersistentVolumeClaims, Deployments, and CronJobs
- Fluentd log collection
- Elasticsearch log output
- jq audit log analysis
- Python audit log analysis
- logrotate
- PrometheusRule alerting

## Sources Consulted
- HashiCorp Vault audit logging overview: https://developer.hashicorp.com/vault/docs/audit
- HashiCorp Vault audit log entry schema: https://developer.hashicorp.com/vault/docs/audit/schema
- HashiCorp Vault audit logging best practices: https://developer.hashicorp.com/vault/docs/audit/best-practices
- HashiCorp Vault `vault audit enable` CLI reference: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- HashiCorp Vault syslog audit device documentation: https://developer.hashicorp.com/vault/docs/audit/syslog
- HashiCorp Vault Helm standalone audit storage example: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/standalone-audit
- HashiCorp Vault Helm configuration reference: https://developer.hashicorp.com/vault/docs/platform/k8s/helm/configuration
- HashiCorp Vault audit telemetry metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/audit
- HashiCorp Vault key metrics for health checks: https://developer.hashicorp.com/vault/docs/internals/telemetry/key-metrics
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Fluentd JSON parser documentation: https://docs.fluentd.org/parser/json

## Issues Found
- Corrected the audit-device behavior explanation. The post said Vault only responds after all enabled audit devices successfully log an event; Vault sends entries to all enabled devices but refuses requests only when it cannot write to at least one enabled audit device.
- Updated the file audit path from `/vault/logs/audit.log` to `/vault/audit/vault_audit.log` to match the official Vault Helm chart `auditStorage` default mount path and examples.
- Clarified that the standalone PVC example is for non-Helm deployments, while the Helm chart provisions audit storage through `server.auditStorage`.
- Added `mountPath: /vault/audit` to the Helm values example so the configured path and the audit command are consistent.
- Added a Kubernetes caveat to the syslog audit section because Vault's syslog audit device writes to a local syslog service on the same Unix host.
- Replaced the Fluentd DaemonSet example with a single Deployment that mounts the standalone Helm audit PVC `audit-vault-0`. A DaemonSet mounting one ReadWriteOnce PVC across nodes would not be valid for typical Kubernetes storage.
- Updated the Fluentd parser configuration to set `time_type string` for parsing Vault's string timestamp field.
- Removed the legacy Elasticsearch `type_name` setting from the Fluentd output.
- Fixed several `jq` filters so they handle missing or null `.error` and `.request.path` fields without runtime errors.
- Fixed the Python analysis script's success-rate calculation so an empty audit log does not cause a divide-by-zero exception.
- Changed the logrotate CronJob example to use `copytruncate`; a separate CronJob pod cannot signal the Vault process with `killall -HUP vault`.
- Replaced undocumented Prometheus metrics (`vault_core_audit_enabled` and `vault_audit_failures_total`) with documented Vault audit telemetry metrics exposed in Prometheus naming form.
- Updated the PVC fullness alert to match Helm-created audit PVC names such as `audit-vault-0` as well as the manual PVC name.

## Review Notes
The post is now technically valid as a standalone/single-pod example. For HA Vault deployments, each Vault pod has its own audit volume when using the Helm chart, so log collectors and log rotation need to be deployed per Vault pod or replaced with stdout-based audit logging and a cluster-level log collector.
