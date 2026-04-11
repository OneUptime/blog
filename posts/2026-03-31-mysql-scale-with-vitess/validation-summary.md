# Validation Summary: How to Scale MySQL with Vitess

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Vitess (vtgate, vttablet, vtctld, topo server)
- Kubernetes (Vitess Operator by PlanetScale)
- VSchema / Vindexes
- Prometheus monitoring

## Sources Consulted
- Vitess official documentation v22 - Reshard reference: https://vitess.io/docs/22.0/reference/programs/vtctldclient/vtctldclient_reshard/
- Vitess official documentation v23 - Resharding user guide: https://vitess.io/docs/23.0/user-guides/configuration-advanced/resharding/
- Vitess official documentation v22 - Ports: https://vitess.io/docs/22.0/user-guides/configuration-basic/ports/
- Vitess official documentation v22 - vtgate reference: https://vitess.io/docs/22.0/reference/programs/vtgate/
- Vitess official documentation v22 - vtctld reference: https://vitess.io/docs/22.0/reference/programs/vtctld/
- PlanetScale vitess-operator GitHub repository: https://github.com/planetscale/vitess-operator
- Vitess Operator official example YAML: https://github.com/planetscale/vitess-operator/blob/main/test/endtoend/operator/101_initial_cluster_vtorc_vtadmin.yaml
- Vitess Operator API docs: https://github.com/planetscale/vitess-operator/blob/main/docs/api.md

## Issues Found
1. **Incorrect `vtctldclient Reshard` command syntax**: The original command used an outdated/incorrect syntax mixing the old `vtctlclient` style with `vtctldclient`. Three specific errors were present:
   - Missing required `create` subcommand (modern vtctldclient Reshard requires subcommands: `create`, `show`, `status`, `switchtraffic`, etc.)
   - Used `commerce.orders` at the end instead of the `--target-keyspace commerce` flag. The `keyspace.workflow` positional format was the old `vtctlclient` (v1) syntax.
   - Implied Reshard operates on individual tables (`commerce.orders`), but Reshard operates on entire keyspaces, not individual tables.
   - **Fix applied**: Changed to `vtctldclient Reshard --target-keyspace commerce --workflow expand_shards create --source-shards '0' --target-shards '-80,80-'`

## Review Notes
- The "Vitess UI accessible at port 15000 on vtctld" statement is technically correct (vtctld serves basic debug/status pages on port 15000), but modern Vitess (v14+) uses **VTAdmin** on port 14201 for the full-featured administrative web UI. This is not strictly wrong but could be misleading for readers deploying current Vitess versions.
- The vtgate MySQL protocol connection on port 3306 is correct in the Kubernetes context described (the Vitess Operator Service maps port 3306), though vtgate's `--mysql_server_port` flag actually defaults to -1 (disabled) and must be explicitly configured.
- The Vitess Operator CRD (`apiVersion: planetscale.com/v2`, `kind: VitessCluster`) and all field names (`durabilityPolicy`, `partitionings`, `equal.parts`, `shardTemplate`, `tabletPools`) were verified as correct against the official operator source code and examples.
- The VSchema JSON format for defining Vindexes is correct and follows the official Vitess VSchema specification.
- Component descriptions (vtgate, vttablet, vtctld, topo server) are accurate.
