# Validation Summary: How to Fix NVMEOF_GATEWAY_DOWN Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (NVMe-oF gateway health monitoring)
- Rook Ceph Operator (Kubernetes)
- NVMe over Fabrics (NVMe-oF) - TCP/RDMA
- Kubernetes (pod management, debugging)
- nvme-cli (initiator-side diagnostics)

## Sources Consulted
- Ceph health checks documentation (https://github.com/ceph/ceph/blob/main/doc/rados/operations/health-checks.rst) - confirmed NVMEOF_GATEWAY_DOWN is a real health check
- Rook NVMe-oF documentation (https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/) - verified CRD kind and pod labels
- Rook CRD specification (https://rook.io/docs/rook/latest/CRDs/specification/) - confirmed CephNVMeOFGateway kind
- Rook NVMe-oF source code, spec.go (https://github.com/rook/rook/blob/master/pkg/operator/ceph/nvmeof/spec.go) - confirmed AppName = "rook-ceph-nvmeof"
- ceph-nvmeof CLI documentation (https://github.com/ceph/ceph-nvmeof) - verified gateway CLI commands

## Issues Found
1. **Non-existent `ceph nvmeof gw show` command**: The command `ceph nvmeof gw show` does not exist in Ceph. Replaced the two gateway status commands (`ceph nvmeof gw show` and `ceph nvmeof gw info group0`) with the correct standalone CLI command `ceph-nvmeof gw info` executed from within a gateway pod via kubectl exec.

2. **Incorrect Rook CRD kind**: The post used `kind: CephNVMEoF` but the correct Rook CRD kind is `CephNVMeOFGateway`, as defined in the Rook source code and CRD specification. Fixed to use the correct kind.

3. **Incorrect pod label selector**: The post used `app=ceph-nvmeof` but Rook uses the label `app=rook-ceph-nvmeof` (following its standard `rook-ceph-<component>` naming convention). Fixed all occurrences (2 instances).

## Review Notes
- The NVMe-oF gateway feature in Ceph and Rook is relatively new and actively evolving. CLI commands and CRD specifications may change in future releases.
- The `ceph-nvmeof gw info` command is a standalone CLI tool bundled in gateway containers, not a subcommand of the `ceph` CLI itself. The blog now correctly shows it being run via `kubectl exec` into a gateway pod.
- The CephNVMeOFGateway CRD spec structure (with `spec.gateway.resources`) is representative but users should consult the latest Rook documentation for the full set of configurable fields.
- The general troubleshooting approach (check health detail, inspect pods, review logs, restart, check resources/network/credentials) is sound and well-structured.
