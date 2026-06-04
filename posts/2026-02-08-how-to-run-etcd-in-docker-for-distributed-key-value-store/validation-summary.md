# Validation Summary: How to Run etcd in Docker for Distributed Key-Value Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- etcd v3.5
- etcdctl
- etcdutl
- Python
- python-etcd3
- Kubernetes concepts
- Raft consensus

## Sources Consulted
- etcd v3.5 container operations documentation: https://etcd.io/docs/v3.5/op-guide/container/
- etcd v3.5 clustering guide: https://etcd.io/docs/v3.5/op-guide/clustering/
- etcd v3.5 install documentation: https://etcd.io/docs/v3.5/install/
- etcd May 2026 security patch release announcement: https://etcd.io/blog/2026/may-patch-release/
- etcd v3.5 lease tutorial: https://etcd.io/docs/v3.5/tutorials/how-to-create-lease/
- etcd v3.5 cluster status tutorial: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd v3.5 disaster recovery documentation: https://etcd.io/docs/v3.5/op-guide/recovery/
- python-etcd3 API usage documentation: https://python-etcd3.readthedocs.io/en/latest/usage.html
- python-etcd3 Lease source documentation: https://python-etcd3.readthedocs.io/en/latest/_modules/etcd3/leases.html

## Issues Found
- The Docker examples pinned `quay.io/coreos/etcd:v3.5.14`, which is older than the currently recommended v3.5 patch baseline and predates 2026 security fixes. Updated all examples to `quay.io/coreos/etcd:v3.5.30`, the v3.5 patch release identified in the May 2026 etcd security release.
- The backup section used `etcdctl snapshot status`, which is marked deprecated in `etcdctl` 3.5.30. Updated the command to use `etcdutl --write-out=table snapshot status`, matching current official etcd recovery and maintenance documentation.

## Review Notes
The tutorial remains suitable for a development or production-like local Docker cluster. A future production-focused revision should add TLS, authentication/RBAC, and operational maintenance guidance such as compaction and defragmentation.
