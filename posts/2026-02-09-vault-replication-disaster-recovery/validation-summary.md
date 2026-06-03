# Validation Summary: How to configure Vault replication for disaster recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault Enterprise
- Vault disaster recovery replication
- Vault CLI and system API endpoints
- Kubernetes Jobs and NetworkPolicy
- PrometheusRule monitoring

## Sources Consulted
- HashiCorp Vault disaster recovery replication tutorial: https://developer.hashicorp.com/vault/tutorials/enterprise/disaster-recovery
- HashiCorp Vault replication overview: https://developer.hashicorp.com/vault/docs/enterprise/replication
- HashiCorp Vault DR replication API: https://developer.hashicorp.com/vault/api-docs/system/replication/replication-dr
- HashiCorp Vault enterprise replication monitoring tutorial: https://developer.hashicorp.com/vault/tutorials/monitoring/monitor-replication
- HashiCorp Vault availability telemetry metrics reference: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/availability
- HashiCorp Vault health API: https://developer.hashicorp.com/vault/api-docs/system/health
- HashiCorp Vault Kubernetes Enterprise DR with Raft example: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/enterprise-dr-with-raft

## Issues Found
- The network connectivity check tested primary-to-secondary traffic. DR secondaries connect to the primary cluster port, so the example now checks secondary-to-primary connectivity on port 8201.
- The prerequisites implied only similar configuration was needed. HashiCorp requires replicated Vault clusters to run the same version, so the prerequisite was corrected.
- The primary status example used the generic `sys/replication/status` endpoint while showing DR-specific flat fields. It now uses `sys/replication/dr/status`.
- The secondary activation token output used `token`, but the CLI returns a wrapped activation token as `wrapping_token`. The example now reflects the CLI output and uses that wrapping token for secondary activation.
- The replication lag example compared fields from the same secondary in a misleading way. It now compares the primary `last_dr_wal` to the secondary `last_remote_wal`.
- The Prometheus examples used non-official metric names. They now use Vault telemetry metrics documented for replication and WAL health.
- DR promotion examples omitted the required `dr_operation_token` parameter. Promotion commands and automation now pass a DR operation token explicitly.
- The failover automation authenticated to the DR secondary using Kubernetes auth and then promoted with a normal Vault token. The example now uses a pre-generated DR operation token, which is required for DR promotion.
- The primary health check did not account for Vault standby status codes. It now uses `standbyok=true&perfstandbyok=true`.
- The graceful demotion flow re-enabled the old primary as a secondary with `secondary/enable`, which would wipe storage. It now uses `secondary/update-primary` after demotion, matching HashiCorp's failover guidance.
- The split-brain fencing example used a nonexistent revoke path. It now uses `sys/replication/dr/primary/revoke-secondary`.
- The runbook had an invalid fenced code block terminator and omitted the DR operation token from promotion. Both were fixed.
- The DR test script included an unsupported `-dry-run` promotion flag and referenced nonexistent JSON fields. It now checks status fields directly.
- The secondary health test used a plain `curl -f`, which fails for healthy DR secondaries because Vault returns status code 472 by default. It now passes `drsecondarycode=200`.

## Review Notes
Vault's Prometheus metric names can vary depending on telemetry configuration and exporter conventions. The updated examples use documented Vault telemetry metric names converted to Prometheus-style names, but production alert rules should still be verified against the actual `/v1/sys/metrics?format=prometheus` output from the target Vault deployment.
