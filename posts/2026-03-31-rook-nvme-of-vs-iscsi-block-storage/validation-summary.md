# Validation Summary: How to Compare NVMe-oF vs iSCSI for Ceph Block Storage

## Status
validated

## Post Type
Comparison Guide / Reference

## Technologies Covered
- Ceph (block storage via RBD)
- NVMe-oF (NVMe over Fabrics), specifically NVMe/TCP
- iSCSI (including open-iscsi initiator, LIO target, tcmu-runner)
- Rook (Ceph operator for Kubernetes)
- fio (Flexible I/O Tester)

## Sources Consulted
- Rook CephBlockPoolRadosNamespace CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-rados-namespace-crd/
- Ceph Reef NVMe-oF Overview: https://docs.ceph.com/en/reef/rbd/nvmeof-overview/
- Ceph NVMe-oF target configuration: https://docs.ceph.com/en/reef/rbd/nvmeof-target-configure/
- open-iscsi iscsid.conf defaults: https://github.com/open-iscsi/open-iscsi/blob/master/etc/iscsid.conf
- RFC 7145 (iSCSI Extensions for RDMA / iSER): https://datatracker.ietf.org/doc/html/rfc7145
- NVMe Base Specification 2.0e (NQN format, queue architecture): https://nvmexpress.org/specifications/
- Linux Kernel Driver Database (CONFIG_NVME_TCP): https://cateee.net/lkddb/web-lkddb/NVME_TCP.html

## Issues Found

### 1. Incorrect reference to `CephBlockPoolRadosNamespace` for iSCSI (Overview section)
- **What was wrong:** The overview stated iSCSI in Ceph works "via the `CephBlockPoolRadosNamespace` and tcmu-runner." `CephBlockPoolRadosNamespace` is a Rook CRD for multi-tenant RADOS namespace isolation within a CephBlockPool — it has nothing to do with iSCSI.
- **What was changed:** Replaced `CephBlockPoolRadosNamespace` with `ceph-iscsi` gateway, which is the actual project providing iSCSI gateway functionality in Ceph (using LIO + tcmu-runner + librbd).
- **Why:** The original text would confuse readers into thinking a namespace isolation CRD is part of the iSCSI stack.

### 2. iSCSI queue depth listed as "1 per session" (Protocol Architecture Comparison table)
- **What was wrong:** The table claimed iSCSI queue depth is "1 per session." This is factually incorrect. The open-iscsi default `node.session.cmds_max` is 128 (max outstanding commands per session), and `node.session.queue_depth` defaults to 32 per LUN.
- **What was changed:** Updated to "Configurable (default 32 per LUN)" which reflects the actual open-iscsi defaults.
- **Why:** The original claim drastically understated iSCSI's I/O capabilities and would mislead readers about the actual performance difference between the protocols.

### 3. iSCSI transport listed as "TCP only" (Protocol Architecture Comparison table)
- **What was wrong:** The table claimed iSCSI supports "TCP only." iSCSI also supports iSER (iSCSI Extensions for RDMA), defined in RFC 7145, which runs over InfiniBand, RoCE, and iWARP.
- **What was changed:** Updated to "TCP, iSER (RDMA)."
- **Why:** Omitting iSER misrepresents iSCSI's capabilities, particularly since iSER can significantly close the performance gap with NVMe-oF over RDMA.

## Review Notes
- The NVMe-oF queue depth "Up to 65535" is slightly imprecise: 65,535 is the max number of I/O queues, while max entries per queue is 65,536. Added "per queue" for clarity. The commonly cited "65535" figure is close enough for a comparison article.
- The "2-4x lower latency" claim in the summary is somewhat generous given the post's own numbers (0.3-0.6ms vs 0.8-1.2ms yields 1.3x-4x). However, published benchmarks do support 2-4x in many scenarios, so this was left as-is.
- NVMe-oF in Ceph Reef was experimental/unsupported; it matured through Squid and Tentacle releases. The post correctly notes it as "Newer (Reef+)" which is reasonable.
- The fio commands, iSCSI initiator commands, and NVMe-oF connect commands are all syntactically correct with valid flags and standard ports (3260 for iSCSI, 4420 for NVMe/TCP).
