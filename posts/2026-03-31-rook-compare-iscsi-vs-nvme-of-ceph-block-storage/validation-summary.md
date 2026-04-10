# Validation Summary: How to Compare iSCSI vs NVMe-oF for Ceph Block Storage

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Ceph (RBD block storage)
- Rook (Ceph orchestration on Kubernetes)
- iSCSI (Internet Small Computer Systems Interface)
- NVMe-oF (NVMe over Fabrics) — TCP and RDMA transports
- fio (Flexible I/O Tester)
- open-iscsi (iscsiadm)
- nvme-cli
- targetcli
- Ceph Orchestrator (ceph orch)

## Sources Consulted
- open-iscsi iscsid.conf defaults: https://github.com/open-iscsi/open-iscsi/blob/master/etc/iscsid.conf
- Red Hat — iSCSI queue depth: https://access.redhat.com/solutions/54095
- NVMe Queues Explained — Western Digital: https://blog.westerndigital.com/nvme-queues-explained/
- NVM Express Base Specification (queue depth and queue count limits)
- Ceph NVMe-oF Gateway Overview (Reef): https://docs.ceph.com/en/reef/rbd/nvmeof-overview/
- Ceph NVMe-oF Target Configuration (Reef): https://docs.ceph.com/en/reef/rbd/nvmeof-target-configure/
- Ceph NvmeofServiceSpec source code: https://github.com/ceph/ceph/blob/main/src/python-common/ceph/deployment/service_spec.py
- NVMe-oF specification for port 4420 (IANA-assigned)
- nvme-cli man pages (nvme-discover)
- fio documentation (fio --help)

## Issues Found

### 1. Incorrect iSCSI Queue Depth (Line 23)
- **What was wrong:** The performance comparison table listed iSCSI queue depth as "1 (SCSI)", implying SCSI only supports a single outstanding command. This is incorrect — SCSI has supported Tagged Command Queuing (TCQ) since SCSI-2 (1990s), and the open-iscsi initiator defaults to a queue depth of 32 per LUN (configurable up to 1024).
- **What was changed:** Updated from "1 (SCSI)" to "Configurable (default 32 per LUN)".
- **Why:** The original claim was factually wrong and significantly misrepresented iSCSI's capabilities.

### 2. Imprecise NVMe-oF Queue Depth (Line 23)
- **What was wrong:** The table listed NVMe-oF queue depth as "65535 per namespace", which conflates the number of I/O submission queues (up to 65,535) with the queue depth per queue (up to 65,536 entries).
- **What was changed:** Updated to "Up to 65536 per queue (multi-queue)" to clarify that NVMe supports multiple queues each with deep entries.
- **Why:** The original phrasing was misleading about what the 65535 number actually represents.

### 3. Invalid Ceph NVMe-oF Gateway Service Spec Fields (Lines 98-104)
- **What was wrong:** The YAML spec contained three fields that do not exist in the Ceph `NvmeofServiceSpec`: `daemon_hosts`, `default_transport`, and `default_addr`. These are not recognized by the Ceph orchestrator.
- **What was changed:** Removed the invalid fields and replaced with the correct minimal spec using `pool` and `enable_auth` fields, which are the actual valid fields per the Ceph source code and documentation.
- **Why:** Using non-existent fields would cause the spec to either be silently ignored or cause errors when applied via `ceph orch apply`.

## Review Notes
- The performance comparison table numbers (latency, IOPS) are rough ballpark estimates. Actual performance varies greatly depending on hardware, network configuration, Ceph cluster size, and workload characteristics. The numbers are reasonable for a high-level comparison but should not be taken as benchmarks.
- The fio commands are correct and use standard options. For a more thorough benchmark, users may want to add `--ioengine=libaio` (Linux AIO) or `--ioengine=io_uring` explicitly, as the default ioengine may vary by platform.
- The `ceph orch apply` command is correct for deploying services via spec files.
- Port 4420 is the correct IANA-assigned NVMe-oF discovery port.
- The coexistence claim (iSCSI and NVMe-oF running simultaneously on the same Ceph cluster) is accurate.
