# Validation Summary: How to Configure the Local Pool Module in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (Manager modules, RADOS pools, CRUSH rules, pool quotas)
- Rook (CephBlockPool CRD, Kubernetes-based Ceph orchestration)
- Kubernetes (kubectl exec commands)

## Sources Consulted
- Ceph official documentation for the localpool module: https://docs.ceph.com/en/latest/mgr/localpool/
- Ceph source code for localpool module: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/localpool/module.py
- Ceph localpool documentation RST: https://github.com/ceph/ceph/blob/main/doc/mgr/localpool.rst
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found

1. **Incorrect module description**: The post described the localpool module as providing "a simplified interface for creating and managing RADOS pools" with "pre-defined profiles" and "a CLI wrapper for common pool operations." In reality, the localpool module automatically creates localized pools for each CRUSH subtree (e.g., per rack or per host) by monitoring OSD map changes in the background. It does not provide a CLI wrapper or use pre-defined profiles. Fixed the intro paragraph and bullet points to accurately describe the module's behavior.

2. **Non-existent `mgr/localpool/crush_rule` config option**: The post included a command to set `mgr/localpool/crush_rule`, which is not a valid configuration option. The actual valid options are: `subtree` (default: rack), `failure_domain` (default: host), `num_rep` (default: 3), `min_size`, `pg_num` (default: 128), and `prefix`. Replaced with `mgr/localpool/subtree`, which controls the CRUSH level for pool creation and is the closest relevant option.

3. **Misleading "Creating Pools via the Local Pool Module" section**: The section used standard `ceph osd pool create` commands but framed them as being specific to the localpool module. The localpool module creates pools automatically and does not provide CLI commands for manual pool creation. Renamed the section to "Creating Pools Manually" and added a note clarifying the distinction.

## Review Notes
- The CephBlockPool YAML, pool health check commands, and pool quota commands are all technically correct.
- The `ceph osd pool create my-app-pool 32 32` syntax with explicit pg_num/pgp_num is valid but modern Ceph versions (Nautilus+) support pg-autoscaling, so specifying PG counts manually may not be necessary in newer deployments.
- The 100 GB quota calculation (107374182400 bytes) is correct (100 * 1024^3 = 107,374,182,400).
