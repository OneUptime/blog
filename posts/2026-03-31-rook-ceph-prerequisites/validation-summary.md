# Validation Summary: How to Set Up Rook-Ceph Prerequisites on Your Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / Checklist Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Linux kernel modules (rbd, ceph)
- LVM2 (Logical Volume Manager)
- Pod Security Admission (Kubernetes)
- systemd modules-load.d

## Sources Consulted
- Rook official documentation on prerequisites: https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/
- Rook documentation on Ceph OSD cleanup: https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/
- Ceph documentation on network configuration and ports: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- LVM2 pvremove man page for --force flag behavior
- Cross-referenced with other validated Rook-Ceph posts in this blog (firewall ports, pod security policies, node requirements)

## Issues Found
- **Missing monitor port 3300 (msgr2)**: The network requirements section listed only port 6789 for Ceph monitors. Since Ceph Nautilus (and all Rook versions that support it), the msgr2 protocol on port 3300 is the default. Port 6789 is retained for legacy msgr1 compatibility. Fixed by adding port 3300 to the firewall port list with a note that it is the msgr2 protocol, and clarifying that 6789 is the legacy msgr1 protocol.

## Review Notes
- The pre-flight validation script uses `awk '$2=="" && $6==""'` to parse `lsblk -f` output. The column positions may vary across different versions of util-linux; newer versions include additional columns (FSVER, FSAVAIL, FSUSE%). The script will work on most standard distributions but is not guaranteed portable across all util-linux versions.
- The `kubectl auth can-i` command in the Container Runtime Requirements section tests RBAC authorization for the service account, not the container runtime's configuration for privileged pods directly. It is still a useful check but does not fully validate that the runtime allows privileged containers.
- The 1 Gbps network recommendation is a reasonable minimum. Production deployments with heavy workloads typically benefit from 10 Gbps or higher, especially for the OSD replication network.
