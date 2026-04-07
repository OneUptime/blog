# Validation Summary: How to Troubleshoot NVMe-oF Connection Issues in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NVMe-oF Gateway (NVMe over Fabrics)
- nvme-cli (Linux NVMe userspace tooling)
- Kubernetes (kubectl)
- Linux kernel modules (nvme_fabrics, nvme_tcp, nvme_rdma)

## Sources Consulted
- NVMe-oF specification (NVM Express over Fabrics): port 4420 is the standard I/O port, port 8009 is the discovery service port (IANA assigned)
- nvme-cli documentation: `nvme discover` and `nvme connect` flag usage (`-t`, `-a`, `-s`, `-n`, `--reconnect-delay`)
- Ceph NVMe-oF Gateway documentation: https://docs.ceph.com/en/latest/rbd/nvmeof/
- Rook NVMe-oF documentation: https://rook.io/docs/rook/latest/Storage-Configuration/NVMe-oF/
- Linux kernel module naming conventions (modprobe uses hyphens, lsmod shows underscores)

## Issues Found
- **Incorrect discovery port in Layer 5**: The `nvme discover` command used `-s 4420` (the I/O subsystem port), but NVMe-oF discovery runs on port 8009. The post itself correctly identifies port 8009 as the discovery port in Layer 2. Fixed to `-s 8009`.

## Review Notes
- The Ceph NVMe-oF CLI commands (`ceph nvmeof subsystem list`, etc.) reflect the newer Ceph NVMe-oF gateway management interface. The exact CLI syntax may vary between Ceph versions as the NVMe-oF gateway feature is still maturing.
- The pod label `app=rook-ceph-nvmeof` and pod naming convention are reasonable for Rook-managed deployments but may vary depending on the Rook version and CRD configuration.
- The NQN format `nqn.2024-01.io.ceph:mysubsystem` follows the correct NQN naming convention (nqn.yyyy-mm.reverse-domain:identifier).
