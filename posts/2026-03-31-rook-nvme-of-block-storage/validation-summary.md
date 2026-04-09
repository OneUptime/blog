# Validation Summary: How to Set Up NVMe-oF Block Storage with Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (Reef v18+)
- NVMe-oF (NVMe over Fabrics) / NVMe-oF TCP
- Kubernetes (StorageClass, DaemonSet, CSI)
- SPDK (Storage Performance Development Kit)
- CephBlockPool CRD
- CephNVMeOFGateway CRD
- Ceph RBD CSI driver / NVMe-oF CSI driver

## Sources Consulted
- Rook GitHub repository CRD definitions and Go types: https://github.com/rook/rook (pkg/apis/ceph.rook.io/v1/types.go, deploy/examples/nvmeof-test.yaml, deploy/examples/csi/nvmeof/storageclass.yaml)
- Rook v1.19.0 release notes: https://github.com/rook/rook/releases/tag/v1.19.0
- Ceph NVMe-oF Target Configuration (Reef): https://docs.ceph.com/en/reef/rbd/nvmeof-target-configure/
- Ceph NVMe-oF Gateway Overview: https://docs.ceph.com/en/reef/rbd/nvmeof-overview/
- Ceph NVMe-oF Requirements: https://docs.ceph.com/en/reef/rbd/nvmeof-requirements/
- Ceph NVMe-oF Initiator for Linux: https://docs.ceph.com/en/reef/rbd/nvmeof-initiator-linux/
- Ceph MonCommands.h (nvme-gw CLI definitions): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- ceph-nvmeof GitHub project: https://github.com/ceph/ceph-nvmeof
- Kubernetes pause container registry migration: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/

## Issues Found

1. **CRD name incorrect**: `CephNVMeoFGateway` changed to `CephNVMeOFGateway` (correct capitalization per Rook CRD definitions).

2. **Rook version wrong**: Post claimed "Rook v1.13 or newer" for NVMe-oF support. NVMe-oF gateway support was actually introduced in Rook v1.19.0 as an experimental feature. Fixed to "Rook v1.19 or newer".

3. **Linux kernel minimum overstated**: Post stated "Linux kernel 5.15+" as the minimum. The nvme-tcp kernel module was introduced in Linux kernel 5.0. Fixed to "5.0+".

4. **CephNVMeOFGateway spec structure incorrect**: The YAML had several wrong fields:
   - `gatewaySpec.instances` does not exist; the correct field is `instances` (top-level in spec). Fixed.
   - `network.hostNetwork` does not exist; the correct field is `hostNetwork` (top-level in spec). Fixed.
   - `serviceAccount` is not a configurable CRD field (it is hardcoded to `rook-ceph-nvmeof` by the operator). Removed.
   - Added missing required fields: `image` (set to `quay.io/ceph/nvmeof:1.5`) and `group` (set to `nvmeof-group-1`).

5. **Pod label selector incorrect**: `app=ceph-nvmeof-gateway` changed to `app=rook-ceph-nvmeof` (the correct label set by the Rook operator's AppName constant).

6. **`ceph nvme-gw create` command missing parameter**: The command requires three positional arguments: `<id> <pool> <group>`. The blog was missing the gateway ID. Fixed to `ceph nvme-gw create gw-1 nvmeof-pool nvmeof-group-1`.

7. **`ceph nvme-gw list` command does not exist**: There is no `list` subcommand for `ceph nvme-gw`. The correct command to view gateways is `ceph nvme-gw show <pool> <group>`. Fixed to `ceph nvme-gw show nvmeof-pool nvmeof-group-1`.

8. **StorageClass used wrong CSI provisioner**: The post used `rook-ceph.rbd.csi.ceph.com` with a nonexistent `mounter: nvme` parameter. NVMe-oF volumes use a dedicated CSI provisioner (`rook-ceph.nvmeof.csi.ceph.com`), not the RBD CSI driver. Fixed the provisioner name and replaced incorrect RBD-specific parameters (`imageFormat`, `imageFeatures`, `mounter`) with the correct NVMe-oF parameter (`subsystemNQN`).

9. **Pause container image outdated**: `gcr.io/google_containers/pause:3.1` is deprecated (old registry, old version). Updated to `registry.k8s.io/pause:3.9`.

10. **kubectl debug image**: Changed `busybox` to `alpine` for the `modinfo` command, since busybox typically does not include `modinfo` while alpine ships it via the util-linux package.

## Review Notes
- NVMe-oF support in Rook is marked as experimental as of v1.19. The post should ideally note this caveat more prominently for production users.
- The `ceph nvme-gw create` command is a low-level monitor command used internally by cephadm to register gateways. For subsystem management, the `nvmeof-cli` tool (or Ceph Dashboard) is the intended user-facing interface. The blog's Step 5 conflates gateway registration with subsystem creation.
- The NQN `nqn.2016-06.io.spdk:cnode1` is valid and used in official Ceph documentation examples, though production deployments should use an organization-specific NQN.
- Port 4420 is the correct standard NVMe/TCP data port.
- The NVMe-oF CSI provisioner and its exact parameter set may evolve as Rook's NVMe-oF support matures beyond experimental status.
