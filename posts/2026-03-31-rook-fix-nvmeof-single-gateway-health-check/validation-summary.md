# Validation Summary: How to Fix NVMEOF_SINGLE_GATEWAY Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (NVMe-oF gateway, health checks)
- Rook Operator (CephNVMeOFGateway custom resource)
- Kubernetes (kubectl, pod management)
- NVMe-oF (NVMe over Fabrics, nvme-cli)
- Linux native NVMe multipath

## Sources Consulted
- Ceph source code: `src/mon/NVMeofGwMap.cc` (NVMEOF_SINGLE_GATEWAY health check definition)
- Ceph source code: `src/mon/MonCommands.h` (nvme-gw CLI commands)
- Ceph documentation: `doc/rados/operations/health-checks.rst`
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` (CephNVMeOFGateway type definition)
- Rook source code: `pkg/apis/ceph.rook.io/v1/register.go` (CR registration)
- Rook source code: `pkg/operator/ceph/nvmeof/spec.go` (pod spec, labels, ports)
- Rook example manifest: `deploy/examples/nvmeof-test.yaml`
- Rook documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Rook CRD specification: https://rook.io/docs/rook/latest-release/CRDs/specification/
- Linux kernel NVMe multipath documentation

## Issues Found

1. **Incorrect health warning message text**: The example `ceph health detail` output used fabricated message text. Fixed to match the actual Ceph source code output format: `"1 group(s) have only 1 nvmeof gateway; HA is not possible with single gateway."` with detail `"NVMeoF Gateway Group 'group0' has 1 gateway."`.

2. **Non-existent Ceph CLI commands**: `ceph nvmeof gw show` and `ceph nvmeof gw list` do not exist. The actual Ceph monitor command is `ceph nvme-gw show <pool> <group>` (note the hyphen and required pool/group arguments). Fixed all occurrences.

3. **Wrong Rook CR kind**: The post used `CephNVMEoF` as the Kubernetes kind. The correct kind is `CephNVMeOFGateway` (different capitalization and includes "Gateway"). Fixed in the YAML example and all text references.

4. **Incorrect CR spec structure**: The post nested fields under `spec.gateway` (e.g., `spec.gateway.instances`, `spec.gateway.svcPort`). The actual CephNVMeOFGateway spec has `instances` and `resources` as direct children of `spec`. Fixed the YAML example.

5. **Fabricated `serviceAccountName` field**: The post included `serviceAccountName: rook-ceph-operator` in the CR spec. This field does not exist in the CephNVMeOFGateway spec; the service account is hardcoded internally as `rook-ceph-nvmeof`. Removed from the YAML example.

6. **Wrong pod label selector**: The post used `app=ceph-nvmeof` for kubectl label selectors. The actual label set by Rook is `app=rook-ceph-nvmeof` (with the `rook-` prefix). Fixed all occurrences.

7. **Incorrect multipath instructions**: The post claimed `nvme list` and `cat /etc/nvme/hostnqn` would "enable multipath". These are read-only diagnostic commands. Replaced with the actual steps: setting the `nvme_core multipath=Y` kernel parameter, rebooting, verifying, and then connecting to both gateways.

## Review Notes
- The claim that NVMe-oF was "introduced in Ceph Reef" is broadly correct (Reef added initial NVMe-oF target support), but the NVMEOF_SINGLE_GATEWAY health check itself was added in a later release (Squid or later). The post doesn't make a specific claim about when the health check was added, so no change was needed.
- Port 5500 (removed from the CR example) is the gateway management/gRPC port. Port 4420 is the NVMe-oF data plane port (correctly used in the `nvme connect-all` commands).
- The `nvme connect-all` command performs discovery before connecting, so it requires a discovery controller on the target. This is standard for Ceph NVMe-oF gateways but worth noting.
