# Validation Summary: Using Vitess for MySQL Horizontal Sharding on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vitess
- MySQL
- Kubernetes
- Vitess Kubernetes Operator
- VSchema and vindexes
- vtctldclient
- Prometheus ServiceMonitor

## Sources Consulted
- Vitess Operator for Kubernetes: https://vitess.io/docs/25.0/get-started/operator/
- Vitess Operator API reference: https://vitess-operator.planetscale.dev/api
- Vitess VSchema reference: https://vitess.io/docs/25.0/reference/features/vschema/
- Vitess Vindexes reference: https://vitess.io/docs/25.0/reference/features/vindexes/
- vtctldclient ApplyVSchema reference: https://vitess.io/docs/25.0/reference/programs/vtctldclient/vtctldclient_applyvschema/
- vtctldclient Reshard create reference: https://vitess.io/docs/25.0/reference/programs/vtctldclient/vtctldclient_reshard/vtctldclient_reshard_create/
- vtctldclient Reshard switchtraffic reference: https://vitess.io/docs/25.0/reference/programs/vtctldclient/vtctldclient_reshard/vtctldclient_reshard_switchtraffic/
- VTOrc user guide: https://vitess.io/docs/24.0/user-guides/configuration-basic/vtorc/
- VTOrc with Vitess Operator: https://vitess.io/docs/25.0/reference/vtorc/running_with_vtop/

## Issues Found
- The `consistent_lookup_unique` vindex used `"to": "customer_id"`, but Vitess lookup vindexes route through a keyspace ID. Changed it to `"to": "keyspace_id"` and adjusted the `customer_lookup` table to store `email` and `keyspace_id`.
- The sharded tables used MySQL `AUTO_INCREMENT` without defining Vitess sequence tables and VSchema `auto_increment` mappings. Removed `AUTO_INCREMENT` from the sample DDL and updated the sample customer insert to supply `customer_id` explicitly.
- The reference table explanation implied Vitess automatically copies reference table data to every shard. Clarified that Vitess treats per-shard copies as identical and that the deployment must keep the copies in sync.
- The `ApplyVSchema` example referenced `/tmp/vschema.json` inside the vtctld pod without showing how it got there, and omitted the required vtctldclient server target. Added `kubectl cp` and `--server localhost:15999`.
- The resharding commands omitted the required vtctldclient server target. Added `--server localhost:15999`.
- The resharding text said the `Reshard create` command creates the new shards. Clarified that target shards/tablet pools must already be running, and that the command creates the VReplication workflow.
- The resharding read switch included `rdonly` tablets even though the cluster example only defines a `replica` tablet pool. Changed the example to switch `replica` traffic.

## Review Notes
- The sample VitessCluster remains illustrative rather than a complete production manifest. A production deployment should include version pinning consistent with the operator compatibility matrix, backups, authentication secrets, durability policy choices, and a complete target shard partitioning change before resharding.
- VTOrc is accurately described as Vitess's automated fault detection and repair tool. In the operator, it is configured with `vitessOrchestrator` under a keyspace; that detailed configuration is outside the scope of the post's current example.
