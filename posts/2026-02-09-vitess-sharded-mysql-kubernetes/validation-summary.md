# Validation Summary: How to Deploy Vitess for Horizontally Sharded MySQL on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Vitess
- Vitess Operator for Kubernetes
- MySQL
- Kubernetes
- VSchema and vindexes
- vtctldclient
- Prometheus ServiceMonitor
- S3 backups

## Sources Consulted
- Vitess Operator API reference for `VitessCluster`, backup storage, `VitessBackupSchedule`, labels, and gateway/tablet fields: https://vitess-operator.planetscale.dev/api
- PlanetScale Vitess Operator v2.16.0 manifests and generated API docs: https://github.com/planetscale/vitess-operator/tree/v2.16.0
- Vitess v23 `vtctldclient ApplyVSchema` reference: https://vitess.io/docs/23.0/reference/programs/vtctldclient/vtctldclient_applyvschema/
- Vitess v23 `vtctldclient Reshard create` reference: https://vitess.io/docs/23.0/reference/programs/vtctldclient/vtctldclient_reshard/vtctldclient_reshard_create/
- Vitess v23 `vtctldclient Reshard switchtraffic` reference: https://vitess.io/docs/23.0/reference/programs/vtctldclient/vtctldclient_reshard/vtctldclient_reshard_switchtraffic/
- Vitess VSchema reference, including primary vindexes, sequences, and reference tables: https://vitess.io/docs/25.0/reference/features/vschema/
- Vitess reference tables documentation: https://vitess.io/docs/23.0/reference/vreplication/reference_tables/
- Vitess monitoring FAQ and metrics guidance: https://vitess.io/docs/faq/getting-started/metrics/how-can-i-monitor-or-get-metrics-from-vitess/
- Vitess query routing FAQ for `keyspace@tablet_type` syntax: https://vitess.io/docs/faq/operating-vitess/queries/can-i-choose-between-primary-and-replica-for/
- Vitess read query load-balancing documentation for VTGate replication-lag flags: https://vitess.io/docs/22.0/user-guides/configuration-advanced/query-load-balancing/

## Issues Found
- The operator install command applied only `deploy/operator.yaml`, which does not install the full CRD/RBAC/controller set. Updated it to use the official kustomize deployment path for v2.16.0 and corrected the pod verification command.
- The post claimed the operator creates StatefulSets for MySQL, vtgate, and vtctld. Updated this to the more accurate Kubernetes resource description used by the operator.
- The architecture section overstated automatic cross-shard join handling. Reworded it to note that Vitess supports many cross-shard queries, but joins require careful design.
- The sharded `customers` and `orders` tables used `AUTO_INCREMENT` without defining Vitess sequences. Removed `AUTO_INCREMENT` and changed sample inserts to provide explicit primary-vindex values.
- The sample `EXPLAIN` query filtered by `email`, which is not the configured primary vindex. Changed it to filter by `id` so the routing example matches the VSchema.
- Corrected the prose typo `vtctlclient` to `vtctldclient`.
- Updated ServiceMonitor selectors from generic `app` labels to the operator-generated `planetscale.com/component` labels.
- Replaced inaccurate metric names/descriptions with Vitess-documented metrics and expvar names such as `VTGateApi`, `HealthcheckConnections`, `VReplicationLagSeconds`, and `VReplicationStreamState`.
- Renamed backup strategy examples to avoid ambiguous shard-name-derived labels while preserving the correct shard values `-80` and `80-`.

## Review Notes
The tutorial remains a simplified production-style example. A future improvement would be to show a complete Vitess sequence keyspace for generated IDs, and a complete reference-table source workflow if `products` needs writes rather than read-only replicated reference data.
