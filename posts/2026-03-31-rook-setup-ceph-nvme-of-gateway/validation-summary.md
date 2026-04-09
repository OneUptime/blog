# Validation Summary: How to Set Up Ceph NVMe-oF Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph NVMe-oF Gateway (NVMe over Fabrics)
- SPDK (Storage Performance Development Kit)
- Kubernetes
- NVMe-oF / NVMe-TCP protocol
- Ceph RBD (RADOS Block Device)

## Sources Consulted
- Rook NVMe-oF Block Storage documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Rook CRD Specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook GitHub source code (`pkg/apis/ceph.rook.io/v1/types.go`, `deploy/examples/nvmeof-test.yaml`)
- Rook GitHub releases: https://github.com/rook/rook/releases
- ceph/ceph-nvmeof GitHub repository: https://github.com/ceph/ceph-nvmeof
- NVM Express TCP Transport Specification (IANA port 4420)

## Issues Found

### 1. CRD Kind Casing Error
- **What was wrong:** The CRD kind was written as `CephNVMeoFGateway` (lowercase 'o').
- **What was changed:** Corrected to `CephNVMeOFGateway` (uppercase 'O' and 'F').
- **Why:** The Rook source code defines the kind as `CephNVMeOFGateway`. The incorrect casing would cause Kubernetes to reject the resource.

### 2. Incorrect Version Requirements
- **What was wrong:** Post stated "Rook v1.13+ and Ceph Reef+".
- **What was changed:** Corrected to "Rook v1.19+ and Ceph Tentacle v20+".
- **Why:** NVMe-oF gateway support was introduced in Rook v1.19.0 (January 2026) and requires Ceph Tentacle (v20), not Reef. The example YAML in the Rook repo explicitly states "This example is for Ceph v20 and above only."

### 3. Completely Wrong CRD Spec Structure
- **What was wrong:** The spec used nested fields (`server.active`, `pool.name`) and included a `storageClass` section that does not belong in the CRD.
- **What was changed:** Replaced with the correct flat spec fields: `image`, `pool`, `group`, and `instances`. Removed the `storageClass` section entirely.
- **Why:** The actual `NVMeOFGatewaySpec` uses flat fields. `instances` replaces `server.active`, `pool` is a flat string (not `pool.name`), and `image` and `group` are required fields. The StorageClass is a separate Kubernetes resource, not part of the gateway CRD.

### 4. All CLI Commands Used Wrong Tool and Syntax
- **What was wrong:** All management commands used `ceph nvmeof ...` which does not exist as a Ceph CLI subcommand. The Ceph NVMe-oF gateway uses a dedicated gRPC-based CLI tool called `cephnvmf`.
- **What was changed:**
  - `ceph nvmeof gateway info` changed to `cephnvmf gw info`
  - `ceph nvmeof subsystem create --nqn` changed to `cephnvmf subsystem add --subsystem`
  - `ceph nvmeof namespace create --nqn` changed to `cephnvmf namespace add --subsystem` (added `--rbd-create-image` flag)
  - `ceph nvmeof gateway add_listener --nqn --trtype TCP` changed to `cephnvmf listener add --subsystem` (removed non-existent `--trtype` flag)
- **Why:** The NVMe-oF gateway management is done via gRPC, not through the standard `ceph` CLI. The correct tool is `cephnvmf`. Additionally, the subcommands use `add` not `create`, and use `--subsystem` not `--nqn`.

### 5. Commands Executed in Wrong Pod
- **What was wrong:** NVMe-oF management commands were run via `deploy/rook-ceph-tools` (the Ceph toolbox pod).
- **What was changed:** Changed to `deploy/rook-ceph-nvmeof-nvmeof-gw` (the NVMe-oF gateway pod).
- **Why:** The `cephnvmf` CLI is available in the NVMe-oF gateway container image, not in the standard Ceph tools pod. It communicates with the gateway daemon over gRPC on localhost.

## Review Notes
- Port 4420 is correctly used as the IANA-assigned port for NVMe over Fabrics TCP transport.
- The NQN format `nqn.2024-01.io.ceph:mysubsystem` follows the correct NVMe Qualified Name convention.
- The kernel module loading commands (`modprobe nvme-fabrics`, `modprobe nvme-tcp`) are correct for initiator node preparation.
- The pool creation commands (`ceph osd pool create`, `rbd pool init`) are standard and correct.
- The pod label `app=rook-ceph-nvmeof` used in the verify step is correct per Rook source code.
- The NVMe-oF gateway is built on SPDK as the post's general architecture implies, though this is not explicitly stated.
- The `cephnvmf` CLI communicates with the gateway daemon via gRPC on port 5500 (default). When exec-ing into the gateway pod, this connection uses localhost by default.
