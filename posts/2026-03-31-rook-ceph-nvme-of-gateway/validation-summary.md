# Validation Summary: How to Set Up Ceph NVMe-oF Gateway for RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph NVMe-oF Gateway (NVMe over Fabrics)
- RBD (RADOS Block Device)
- NVMe/TCP protocol
- Kubernetes CRDs
- nvme-cli (Linux NVMe client tools)

## Sources Consulted
- Rook NVMe-oF Block Storage Documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Rook CRD Specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Ceph NVMe-oF Gateway Overview: https://docs.ceph.com/en/latest/rbd/nvmeof-overview/
- Ceph NVMe-oF GitHub Repository: https://github.com/ceph/ceph-nvmeof
- IANA port assignment for NVMe over Fabrics (port 4420)

## Issues Found

1. **Incorrect CRD kind name**: Changed `CephNVMEofGateway` to `CephNVMeOFGateway` to match the actual Rook CRD definition.

2. **Incorrect CRD spec structure**: The blog nested `image` and `instances` under `spec.server`, but the actual CRD uses flat top-level fields (`spec.image`, `spec.instances`). Removed the `server:` nesting.

3. **Missing required `pool` field**: Added `pool: replicapool` to the CRD spec, which is a required field specifying the RADOS pool for NVMe-oF configuration.

4. **Incorrect field name `serviceLoadBalancerSourceRanges`**: Changed to `loadBalancerSourceRanges` to match the actual CRD spec field name.

5. **Incorrect CLI tool name**: Changed `nvmeof` to `nvmeof-cli` throughout the post. The `nvmeof-cli` is the actual CLI tool from the ceph-nvmeof project that communicates with the gateway via gRPC.

6. **Incorrect subsystem creation command**: Changed `nvmeof subsystem add` to `nvmeof-cli subsystem create`. The correct subcommand for creating a subsystem is `create`, not `add`.

7. **Wrong pod target for CLI commands**: Changed `deploy/rook-ceph-tools` to `deploy/nvmeof-gateway` for the nvmeof-cli commands. The CLI tool runs within the NVMe-oF gateway pod, not the standard Rook toolbox.

8. **kubectl get resource name**: Changed `cephnvmeofgateway` to `cephnvmeofgateways` (plural) for the list command, which is the standard Kubernetes convention.

## Review Notes
- The NVMe/TCP port 4420 is correct per IANA assignment for NVMe over Fabrics.
- The `nvme discover` and `nvme connect` client-side commands use correct flags and syntax for nvme-cli.
- The NQN (NVMe Qualified Name) format used in the examples follows the correct convention.
- The Ceph NVMe-oF gateway feature is relatively new in Rook and may see API changes in future releases. Readers should consult the Rook documentation for their specific version.
