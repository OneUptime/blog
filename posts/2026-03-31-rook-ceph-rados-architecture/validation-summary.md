# Validation Summary: How to Understand the Ceph RADOS Architecture

## Status
validated

## Post Type
Guide / Architectural Overview

## Technologies Covered
- Ceph RADOS (Reliable Autonomic Distributed Object Store)
- Ceph Monitors (MON), OSDs, Managers (MGR)
- CRUSH algorithm
- BlueStore
- Rook-Ceph (Kubernetes operator)
- kubectl CLI
- Ceph CLI (`ceph`, `rados`)

## Sources Consulted
- Ceph official documentation: RADOS architecture (https://docs.ceph.com/en/latest/architecture/)
- Ceph official documentation: Placement Groups (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph official documentation: BlueStore (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Rook documentation: Toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Ceph source code: CRUSH algorithm and write path
- Kubernetes documentation: kubectl exec with deployment references

## Issues Found

### 1. Incorrect toolbox kubectl exec command
- **What was wrong:** The command `kubectl exec -it rook-ceph-tools -n rook-ceph -- bash` used a bare name `rook-ceph-tools`, but the Rook toolbox is a Deployment, so the actual pod name will be `rook-ceph-tools-<replicaset-hash>-<pod-hash>`. Using the bare name would fail with a "pod not found" error.
- **What was changed:** Updated to `kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- bash`, which uses the `deploy/` prefix to let kubectl automatically select a pod from the deployment.
- **Why:** This is the standard and recommended way to exec into a pod managed by a Deployment without needing to look up the full pod name.

### 2. Incorrect write path step ordering
- **What was wrong:** The original steps 3 and 4 stated that the primary replies to the client first (step 3), then described the write as durable (step 4). This implied non-durable acknowledgment, which is incorrect for Ceph's write semantics.
- **What was changed:** Restructured the write path to accurately reflect that: (a) the primary writes to its own BlueStore WAL and forwards to replicas, (b) replicas write to their WAL and acknowledge, (c) only after all durable commits does the primary reply to the client.
- **Why:** In Ceph with BlueStore, the client acknowledgment guarantees durability. The write is committed to the WAL on all acting set members before the client receives confirmation. The original ordering would mislead readers about Ceph's durability guarantees.

## Review Notes
- The description of CRUSH as "consistent hashing" in the Summary section is a common simplification. CRUSH is technically a pseudo-random placement algorithm that is more sophisticated than traditional consistent hashing, but this characterization is acceptable for an architectural overview.
- The object name limit of "4096 characters" is close to the RADOS internal limit (`CEPH_MAX_OID_NAME_LEN`), though it is technically a byte limit rather than a character limit. This distinction is minor for an overview post.
- The post correctly omits the MDS (Metadata Server) daemon from the "Core Components" section since MDS is specific to CephFS and not part of the core RADOS layer.
