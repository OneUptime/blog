# Validation Summary: How to Automate Rancher DR Testing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher backup-restore operator
- Kubernetes
- `kubectl`
- GitHub Actions
- Amazon S3
- AWS CLI
- Bash
- Prometheus / PromQL
- Prometheus Operator
- Grafana dashboard ConfigMaps
- Slack incoming webhooks

## Sources Consulted
- Rancher Restore Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/restore-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Rancher Restoring Rancher: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Rancher Migrating Rancher to a New Cluster: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/migrate-rancher-to-new-cluster
- Rancher Backup Restore Usage Guide: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-restore-usage-guide
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher backup-restore-operator source: https://github.com/rancher/backup-restore-operator
- GitHub Actions schedule event docs: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- AWS CLI `s3 ls` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/s3/ls.html
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Slack incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks

## Issues Found
- The restore workflow mixed Rancher's same-setup restore flow with separate-cluster DR testing. I clarified that the workflow is for the same-setup restore path and pointed readers to Rancher's migration workflow for restores into a different cluster.
- The S3 lookup step passed `rancher/<filename>` as `backupFilename`, but Rancher expects the filename relative to the configured base folder. I stripped the `rancher/` prefix and added an explicit failure when no backup objects are found.
- The post treated `Restore` as namespaced. Rancher's `Restore` resource is cluster-scoped, so I removed namespace usage from the manifest and `kubectl` commands.
- The restore manifest omitted documented S3 fields required for that configuration path. I added `credentialSecretNamespace` and `endpoint`.
- The wait loop checked for `Ready`/`Error` in a way that did not match the operator's exposed status. I updated it to wait for the `Ready` condition message `Completed` and fail on a `Reconciling` reason of `Error`, which aligns with the operator's status handling.
- The validation step used `/v3/ping` and could silently succeed without ever failing when Rancher stayed unavailable. I switched it to Rancher's documented `/healthz` endpoint and made the step fail explicitly if health never returns.
- The backup verification script handled empty S3 results incorrectly and used a Slack webhook example that omitted the documented JSON content type header. I fixed the empty-list handling, corrected the backup count logic, and added the header.
- The dashboard and alert examples referenced metric names that are not the Rancher backup operator's documented metrics, and the "30d pass rate" query was actually all-time. I replaced the Rancher metric names with documented ones, fixed the 30-day PromQL window, and explicitly marked the DR test metrics as custom workflow exports.
- The chaos test example used a fragile fractional BusyBox sleep and assumed the namespace already existed. I changed it to portable CPU load scaffolding and created the namespace first.

## Review Notes
- The dashboard examples now explicitly assume your automation exports custom Prometheus metrics such as `dr_restore_duration_seconds` and `dr_test_total`; Rancher's built-in metrics do not provide those DR-test counters by themselves.
- Rancher backup operator monitoring is disabled by default. The post now notes the required Helm values for enabling metrics and custom Prometheus rules before using the dashboard and alert snippets.
