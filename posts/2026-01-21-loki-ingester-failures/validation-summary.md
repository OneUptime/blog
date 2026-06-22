# Validation Summary: How to Handle Loki Ingester Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana Loki
- Loki ingesters
- Loki Write-Ahead Log (WAL)
- Loki replication and hash ring
- Kubernetes StatefulSets and pod lifecycle hooks
- Prometheus metrics and alerting
- Chaos Mesh

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki Write Ahead Log documentation: https://grafana.com/docs/loki/latest/operations/storage/wal/
- Grafana Loki architecture documentation: https://grafana.com/docs/loki/latest/get-started/architecture/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki troubleshooting documentation: https://grafana.com/docs/loki/latest/operations/troubleshooting/troubleshoot-ingest/
- Grafana Loki monitoring metrics documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/metrics/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/

## Issues Found
- The data flow diagram implied ingesters replicate to other ingesters. Updated it to clarify that distributors write each stream to the configured number of ingesters.
- The WAL lifecycle text said WAL segments are deleted after flush. Updated it to describe checkpoint-based cleanup more accurately.
- The single-ingester failure recovery steps said tokens are redistributed. Updated this to reflect that distributors skip unhealthy ingesters after the heartbeat timeout rather than redistributing tokens as the normal crash response.
- The multiple-ingester failure impact overstated the simple `replication_factor - 1` rule. Updated it to describe quorum loss and multiple replica failures with unflushed data.
- The WAL corruption recovery examples recommended clearing the WAL first. Updated both examples to let Loki attempt automatic repair/replay first and to treat WAL deletion as a last resort because it deletes potentially recoverable data.
- The zone-aware replication examples placed `zone_awareness_enabled` under `common.ring`. Updated them to use `ingester.lifecycler.ring.zone_awareness_enabled`, matching the current Loki ingester ring configuration.
- The `final_sleep` comment described data transfer. Updated it to its documented purpose: keeping the process alive briefly for final metric scrapes.
- The Kubernetes `preStop` example manually sent SIGTERM to PID 1. Updated it to call Loki's `/ingester/prepare_shutdown` endpoint and let Kubernetes send the termination signal.
- The shutdown procedure described flushing the WAL. Updated it to distinguish chunk flushing on `flush_on_shutdown` from WAL replay on restart.
- The complete HA configuration included `max_transfer_retries`, which is not present in the current Loki configuration reference and relates to deprecated handoff behavior. Removed it.

## Review Notes
- The alert for zero chunk flushes can be noisy on quiet clusters; production alerts should usually combine it with ingestion volume or flush error signals.
- Example curl commands may need an `X-Scope-OrgID` header when `auth_enabled: true` is used directly without a gateway that injects tenant headers.
