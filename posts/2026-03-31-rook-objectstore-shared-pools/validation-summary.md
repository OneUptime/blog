# Validation Summary: How to Configure Object Store with Shared Pools in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Storage (RADOS Gateway / RGW)
- Kubernetes Custom Resources (CephObjectStore, CephBlockPool)
- RADOS (Reliable Autonomic Distributed Object Store)
- S3-compatible object storage

## Sources Consulted
- Rook CephObjectStore CRD type definitions (`pkg/apis/ceph.rook.io/v1/types.go` in rook/rook repository) — verified `sharedPools`, `metadataPoolName`, `dataPoolName`, `preserveRadosNamespaceDataOnDelete`, `gateway.port`, `gateway.instances` field names
- Rook official shared pools example (`deploy/examples/object-shared-pools.yaml` in rook/rook repository) — confirmed CephBlockPool usage pattern and RADOS namespace isolation
- Rook shared pools implementation (`pkg/operator/ceph/object/shared_pools.go`) — verified namespace naming convention (`<store>.buckets.data`)
- Ceph `rados` CLI source code (`src/tools/rados/rados.cc`) — verified `rados df -p` flag support and confirmed `lsnamespaces` subcommand does not exist
- Ceph rados man page (`doc/man/8/rados.rst`) — confirmed no `lsnamespaces` subcommand

## Issues Found
1. **Nonexistent `rados lsnamespaces` command** (line 62): The blog used `rados -p shared-object-data lsnamespaces` to list RADOS namespaces in a pool. The `lsnamespaces` subcommand does not exist in the Ceph `rados` CLI. Replaced with `rados -p shared-object-data --all ls`, which lists all objects across all namespaces and shows the namespace prefix for each object. Also updated the sample output to reflect the actual Rook namespace format (`my-store.buckets.data`) instead of just the store name (`my-store`).

## Review Notes
- All other technical claims verified correct: `sharedPools` spec fields, CephBlockPool as shared pool source, `gateway` fields, `rados df -p` flag, and RADOS namespace isolation behavior.
- The `rados df` command with `-p` flag is correct but note that the man page describes `df` as a "global command" — the pool filtering is supported in the implementation but not prominently documented.
- The decision table comparing dedicated vs shared pools is reasonable and aligns with Rook documentation guidance.
