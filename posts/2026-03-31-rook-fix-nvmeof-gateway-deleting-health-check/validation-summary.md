# Validation Summary: How to Fix NVMEOF_GATEWAY_DELETING Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (NVMe-oF gateway subsystem, health checks, auth management)
- Rook Ceph Operator (CephNVMeOFGateway CRD, pod management)
- Kubernetes (kubectl, finalizers, deployments)
- nvme-cli (NVMe-oF initiator disconnect commands)
- SPDK (NVMe-oF target, NQN format)

## Sources Consulted
- Ceph source code (`src/mon/NVMeofGwMap.cc`, `src/mon/MonCommands.h`) for health check message format and CLI commands — https://github.com/ceph/ceph
- Ceph documentation (`doc/rados/operations/health-checks.rst`) for NVMEOF_GATEWAY_DELETING description
- Rook source code (`pkg/apis/ceph.rook.io/v1/types.go`, `pkg/operator/ceph/nvmeof/spec.go`, `deploy/examples/crds.yaml`) for CRD structure, pod labels, and CR spec — https://github.com/rook/rook
- nvme-cli source code (`fabrics.c`) and man pages for `nvme disconnect` flags — https://github.com/linux-nvme/nvme-cli

## Issues Found

1. **Health warning message format was inaccurate** (line 26-27): The example `ceph health detail` output used a fabricated message format. Fixed to match the actual Ceph source code output: `"1 gateway(s) are in deleting state; namespaces are automatically balanced across remaining gateways, this should take a few minutes."` with detail `"NVMeoF Gateway 'nvmeof-gw-b' is in deleting state."`.

2. **Non-existent CLI commands `ceph nvmeof gw show` and `ceph nvmeof gw list`** (line 33-34): These commands do not exist in Ceph. Replaced with `ceph nvmeof gw info`, which is the correct dashboard/mgr command for viewing gateway information.

3. **Wrong CRD name `cephnvmeof`** (line 40): The Rook CRD is `cephnvmeofgateway` (plural: `cephnvmeofgateways`), not `cephnvmeof`. Fixed the kubectl command.

4. **Wrong pod label `app=ceph-nvmeof`** (line 41): The correct Rook pod label for NVMe-oF gateways is `app=rook-ceph-nvmeof`, as defined in the Rook operator source code. Fixed the label selector.

5. **Non-existent command `ceph nvmeof gw delete group0 nvmeof-gw-b --force`** (line 104): This command does not exist. The correct monitor-level command is `ceph nvme-gw delete <id> <pool> <group>` (note the hyphen in `nvme-gw`). There is no `--force` flag. Fixed to `ceph nvme-gw delete nvmeof-gw-b <pool> group0`.

6. **Wrong CR spec structure** (lines 123-127): The blog showed `spec.gateway.instances` with a nested `gateway:` key, but the actual CephNVMeOFGateway spec has `instances` directly under `spec:`. Also corrected the CR name from "CephNVMEoF" to "CephNVMeOFGateway".

## Review Notes
- The `NVMEOF_GATEWAY_DELETING` health check only fires after the `mon_nvmeofgw_delete_grace` period (default: 15 minutes). The post doesn't mention this grace period, which could be useful context for readers.
- The actual cause of the warning per Ceph docs is that namespaces haven't been automatically rebalanced to another load balancing group — not necessarily "stuck" deletion from active connections. The post's listed causes (active connections, finalizers, auth keys) are plausible contributing factors but not the primary mechanism described in Ceph documentation.
- The `nvme disconnect` commands and NQN format are correct and verified against nvme-cli source code.
- The `ceph auth del` and `kubectl rollout restart` commands are standard and correct.
