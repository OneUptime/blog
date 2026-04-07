# Validation Summary: How to Scale Out with NVMe-oF Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (NVMe-oF gateway operator)
- Ceph NVMe-oF gateway (ceph-nvmeof)
- Kubernetes (kubectl)
- NVMe-oF over TCP (nvme-cli client tools)

## Sources Consulted
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` — CRD type definitions for `CephNVMeOFGateway`
- Rook source code: `pkg/operator/ceph/nvmeof/spec.go` — default ports and app label constants
- Rook Helm chart CRD definitions (`resources.yaml`) — CRD field structure
- ceph/ceph-nvmeof project (`pyproject.toml`, CLI source) — CLI tool name and usage patterns
- NVMe-oF TCP standard port 4420 (confirmed in Rook defaults)

## Issues Found
1. **Incorrect CRD kind**: Post used `CephNVMEofGateway` but the correct kind is `CephNVMeOFGateway` (capital O and F). Fixed all occurrences.
2. **Wrong spec nesting**: Post nested fields under `spec.server` (e.g., `spec.server.image`, `spec.server.instances`, `spec.server.resources`), but the actual CRD has these fields flat under `spec` (e.g., `spec.image`, `spec.instances`, `spec.resources`). Fixed in both the full YAML manifest and the partial resource limits snippet.
3. **Missing required fields**: The CRD spec requires `pool` and `group` fields. Added `pool: my-pool` and `group: my-group` to the example manifest.
4. **Incorrect CLI tool**: Post used `nvmeof` as a standalone command run via `kubectl exec` in the rook-ceph-tools pod. The actual tool is `ceph-nvmeof`, a gRPC client that connects directly to the gateway's management port (5500). Fixed all CLI examples to use `ceph-nvmeof --server-address <ip> --server-port 5500`.

## Review Notes
- The default NVMe-oF TCP IO port (4420) and the app label (`rook-ceph-nvmeof`) used in the post are correct.
- The `nvme discover` and `nvme connect` client-side commands in Step 4 are correct standard nvme-cli usage.
- The general scaling concept (increasing instances and adding listeners) is accurate for Rook-Ceph NVMe-oF gateway architecture.
