# Validation Summary: How to Configure mon_target_pg_per_osd Parameter

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph PG Autoscaler
- Ceph CLI (`ceph config`, `ceph osd pool`)
- Rook (mentioned in tags, but post covers Ceph CLI directly)

## Sources Consulted
- Ceph official documentation: Autoscaling Placement Groups (https://docs.ceph.com/en/reef/rados/operations/placement-groups/)
- Ceph source code: `src/common/options/mgr.yaml.in` on reef branch (confirms parameter definition and default value)
- Ceph official documentation: Placement Groups general reference (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)

## Issues Found

### 1. Incorrect config scope for `mon_target_pg_per_osd` commands
- **What was wrong:** The post used `ceph config get mon` and `ceph config set mon` for the `mon_target_pg_per_osd` parameter. However, the official Ceph documentation specifies this parameter should be set at the `global` scope, not the `mon` scope. The parameter is defined in `mgr.yaml.in` (manager options), not monitor options, despite its `mon_` prefix.
- **What was changed:** All instances of `ceph config get mon mon_target_pg_per_osd` were changed to `ceph config get global mon_target_pg_per_osd`, and all instances of `ceph config set mon mon_target_pg_per_osd` were changed to `ceph config set global mon_target_pg_per_osd`.
- **Why:** Using the `mon` scope may result in the parameter not being read correctly by the manager/autoscaler. The official docs explicitly demonstrate `ceph config set global mon_target_pg_per_osd`.

## Review Notes
- The "approximately 10 MB per PG" memory estimate is commonly cited in the Ceph community but is not an official figure from Ceph documentation. Actual memory usage per PG varies significantly based on the number of objects, workload patterns, and Ceph version. The estimate serves as a reasonable upper-bound planning figure.
- The Ceph Reef documentation notes that "for all but the very smallest deployments a value of 200 is recommended" for `mon_target_pg_per_osd`, which differs from the post's recommendation of 100 as the general default. The post's guideline table suggests 100 for most clusters, which was the historical recommendation but may be conservative for newer Ceph releases.
- The post is tagged with "Rook" but contains no Rook-specific content (no CephCluster CRD configuration, no Kubernetes YAML). All commands are standard Ceph CLI. This is not technically incorrect since Rook manages Ceph clusters, but readers expecting Rook-specific guidance (e.g., setting this via the Rook CRD) may find the post does not address that.
