# Validation Summary: How to Configure Ceph NVMe-oF for High-Performance VM Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- Ceph NVMe-oF gateway (SPDK-based)
- NVMe over Fabrics (NVMe-oF) over TCP
- CephBlockPool CRD
- CephNVMeOFGateway CRD
- nvme-cli (Linux NVMe client tools)
- fio (Flexible I/O Tester)
- gRPC API for ceph-nvmeof gateway

## Sources Consulted
- Rook GitHub repository (https://github.com/rook/rook) - CRD type definitions in `pkg/apis/ceph.rook.io/v1/types.go`, CRD manifests, and NVMe-oF design docs
- ceph-nvmeof GitHub repository (https://github.com/ceph/ceph-nvmeof) - protobuf definitions in `control/proto/gateway.proto`, CLI source in `control/cli.py`, default config in `ceph-nvmeof.conf`
- Linux kernel NVMe-TCP module history (merged in kernel 5.0, March 2019)
- NVMe-oF specification (IANA port assignments: 4420 for I/O, 8009 for discovery service)
- fio documentation for ioengine and direct I/O parameters

## Issues Found

1. **Wrong Rook version requirement**: Changed `v1.12+` to `v1.19+`. NVMe-oF gateway CRD support was introduced in Rook v1.19, not v1.12. Also noted that the feature is experimental.

2. **Wrong CRD kind name**: Changed `CephNVMEofGateway` to `CephNVMeOFGateway`. The correct casing uses `NVMe` (lowercase `e`) and `OF` (uppercase).

3. **Completely wrong CRD spec structure**: The original used a fabricated `gatewayConfig` nested structure with `pool`, `serviceId`, `gatewayServerCert`, and an `ips` list. None of these fields exist. Replaced with the correct flat spec structure using the actual required fields: `image`, `pool`, `group`, and `instances`.

4. **Removed invalid `ceph nvme-gw subsystem create` command**: The `ceph nvme-gw` CLI only supports gateway registration (`create`/`delete`), not subsystem management. Subsystem creation is done via the gateway's gRPC API (shown in Step 4). Updated Step 3 title and content accordingly.

5. **Fixed `ceph nvme-gw create` arguments**: Updated to use the correct three arguments: gateway name, pool name, and group name.

6. **Wrong gRPC protobuf module names**: Changed `nvmeof_gateway_pb2` to `gateway_pb2` and `nvmeof_gateway_pb2_grpc` to `gateway_pb2_grpc`. The proto file is `gateway.proto`, so the generated modules are `gateway_pb2`/`gateway_pb2_grpc`. Also fixed the import path to `from control.proto import ...`.

7. **Wrong gRPC method and message names for namespace**: Changed `stub.add_namespace(pb2.add_namespace_req(...))` to `stub.namespace_add(pb2.namespace_add_req(...))`. The RPC method is `namespace_add` and the message type is `namespace_add_req`.

8. **Missing required `enable_ha` field**: Added `enable_ha=True` to the `create_subsystem_req` call, as this is a required field in the protobuf definition.

9. **Missing required `block_size` field**: Added `block_size=512` to the `namespace_add_req` call.

10. **Counterproductive `nr_requests` value**: Changed from 64 to 1024. The default `nr_requests` for NVMe devices is typically ~1023, so setting it to 64 would reduce queue depth — the opposite of the stated tuning goal.

11. **Missing `--ioengine` and `--direct` in fio command**: Added `--ioengine=libaio` and `--direct=1`. Without `--ioengine=libaio`, fio defaults to `psync` (synchronous I/O) which ignores the `--iodepth=64` setting entirely. Without `--direct=1`, results include page cache effects rather than measuring actual device performance.

## Review Notes
- The NVMe-oF discovery port used in Step 5 is 4420, which works in many deployments. However, the NVMe-oF 1.1+ specification assigns port 8009 as the dedicated discovery service port. For Ceph NVMe-oF gateways specifically, 4420 is typically used for both discovery and I/O, so this was left as-is.
- The `fast_read` parameter in the CephBlockPool spec is a valid Ceph pool parameter that enables fast reads from replicas. This is correct.
- The NVMe-oF feature in Rook is marked as experimental and may see API changes in future releases. Users should check the Rook documentation for their specific version.
- The `--time_based` flag could be added to the fio command to ensure it runs for the full duration, but this is a minor enhancement rather than a correctness issue.
