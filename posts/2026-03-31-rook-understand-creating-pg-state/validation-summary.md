# Validation Summary: How to Understand the creating PG State in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (Placement Groups, CRUSH maps, OSDs)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- crushtool CLI

## Sources Consulted
- Ceph official documentation on Placement Group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on CRUSH maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook documentation on CephCluster storage configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph CLI reference for `ceph pg stat`, `ceph osd stat`, `ceph osd tree`, `ceph osd pool get`, `ceph osd crush rule dump`

## Issues Found

1. **Incorrect trigger for creating state**: The post stated PGs enter `creating` when Ceph "adds OSDs." Adding OSDs triggers remapping and peering of existing PGs, not the `creating` state. The `creating` state occurs when new PGs are allocated — specifically when a new pool is created or when `pg_num` is increased on an existing pool. Changed "adds OSDs" to "increases the PG count of an existing pool."

2. **CRUSH map edit commands ran outside the tools pod**: The `crushtool -d` and `crushtool -c` commands were shown running on the local machine, but they referenced `/tmp/crushmap` which only exists inside the Rook tools pod. The `getcrushmap` and `setcrushmap` commands correctly used `kubectl exec`, but the intermediate `crushtool` steps did not. Fixed by wrapping all commands in a single `kubectl exec -- bash -c` invocation so everything runs inside the tools container.

## Review Notes
- The `watch` command with `kubectl exec -it` may cause TTY issues in some terminal environments. Using `-t` without `-i` or removing both flags may be more reliable for `watch` usage, but this is a minor usability concern rather than a correctness issue.
- The `ceph pg stat` output format shown is a simplified representation. Actual output may vary across Ceph versions but the format is representative enough for illustration purposes.
