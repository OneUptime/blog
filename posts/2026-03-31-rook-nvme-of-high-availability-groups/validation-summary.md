# Validation Summary: How to Configure NVMe-oF High Availability Groups in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph Kubernetes operator)
- Ceph NVMe-oF Gateway (ceph-nvmeof)
- NVMe over Fabrics (NVMe-oF/TCP)
- Asymmetric Namespace Access (ANA)
- Kubernetes (kubectl)
- nvme-cli (Linux NVMe user-space tools)

## Sources Consulted
- Rook GitHub repository — CRD definitions in `pkg/apis/ceph.rook.io/v1/types.go` and `deploy/examples/crds.yaml` (https://github.com/rook/rook)
- Rook official NVMe-oF example — `deploy/examples/nvmeof-test.yaml`
- ceph-nvmeof GitHub repository — CLI command definitions and gRPC service spec (https://github.com/ceph/ceph-nvmeof)
- Ceph NVMe-oF Gateway mgr module — command registration and parameter syntax
- nvme-cli documentation and man pages (https://github.com/linux-nvme/nvme-cli)
- nvme-ana-log man page (https://www.mankier.com/1/nvme-ana-log)
- Ceph NVMe-oF overview documentation (https://docs.ceph.com/en/latest/rbd/nvmeof-overview/)
- ceph-nvmeof issue #501 — ANA state behavior for standby paths (https://github.com/ceph/ceph-nvmeof/issues/501)

## Issues Found

### 1. Incorrect CRD kind name
- **What was wrong:** `kind: CephNVMeoFGateway` (lowercase 'o' in 'oF')
- **What was changed:** Corrected to `kind: CephNVMeOFGateway` (uppercase 'O' and 'F' in 'OF')
- **Why:** The Rook CRD registers the kind as `CephNVMeOFGateway` per the official source code.

### 2. Incorrect CRD spec fields
- **What was wrong:** `spec.server.active: 2` and `spec.pool.name: nvmeof-pool`
- **What was changed:** Corrected to `spec.instances: 2` and `spec.pool: nvmeof-pool` (flat fields, not nested). Added required `spec.image` and `spec.group` fields.
- **Why:** The actual CRD struct defines `instances` (not `server.active`) as an integer field directly under `spec`, and `pool` as a plain string (not a nested object). The `image` and `group` fields are required by the CRD.

### 3. Non-existent `ceph nvmeof gateway list` command
- **What was wrong:** `ceph nvmeof gateway list`
- **What was changed:** Corrected to `ceph nvmeof gateway info`
- **Why:** The `gateway list` subcommand does not exist. The correct command is `gateway info`.

### 4. Fabricated `gateway set_redundancy_count` command
- **What was wrong:** `ceph nvmeof gateway set_redundancy_count --gateway-name X --redundancy-count 2`
- **What was changed:** Removed entirely. Added explanatory note that HA group membership is configured declaratively via the CRD's `group` and `instances` fields.
- **Why:** This command does not exist in either the Ceph mgr module or the standalone nvmeof-cli.

### 5. Incorrect subsystem creation syntax
- **What was wrong:** `ceph nvmeof subsystem create --nqn $NQN`
- **What was changed:** Corrected to `ceph nvmeof subsystem add nqn=$NQN`
- **Why:** The action is `add` (not `create`), and the Ceph mgr CLI uses keyword-style parameters (`nqn=VALUE`), not `--flag` style.

### 6. Incorrect listener creation command and syntax
- **What was wrong:** `ceph nvmeof gateway add_listener --nqn $NQN --host-name X --traddr IP --trsvcid 4420 --trtype TCP`
- **What was changed:** Corrected to `ceph nvmeof listener add nqn=$NQN host_name=X traddr=IP trsvcid=4420`. Removed `--trtype TCP`.
- **Why:** Listeners are under the `listener` command (not `gateway`). The Ceph mgr CLI uses keyword-style parameters. The `--trtype` flag does not exist — TCP is the only supported transport and is implicit.

### 7. Incorrect namespace list syntax
- **What was wrong:** `ceph nvmeof namespace list --nqn $NQN`
- **What was changed:** Corrected to `ceph nvmeof namespace list nqn=$NQN`
- **Why:** The Ceph mgr CLI uses keyword-style parameters, not `--flag` style.

### 8. Non-existent `nvme show-ana` command
- **What was wrong:** `nvme show-ana /dev/nvme0` (used twice)
- **What was changed:** Corrected to `nvme ana-log /dev/nvme0`
- **Why:** `show-ana` is not a valid nvme-cli subcommand. The correct command to display ANA log information is `nvme ana-log`.

### 9. Inaccurate ANA state description
- **What was wrong:** Post stated namespaces show "optimized/non-optimized paths" and are "accessible via all gateways"
- **What was changed:** Corrected to state that non-owning gateways report the namespace as "inaccessible" (not "non-optimized"), and clarified the ANA behavior.
- **Why:** Ceph NVMe-oF uses active/standby with ANA inaccessible state for non-owning gateways, not active/active with non-optimized paths.

## Review Notes
- The NVMe-oF port 4420 is correct — it is the IANA-assigned default port for NVMe over Fabrics.
- The `spec.image` field was set to `quay.io/ceph/nvmeof:1.5` as an example; users should check for the latest available version.
- There are two separate CLIs for Ceph NVMe-oF: the integrated `ceph nvmeof` mgr module (keyword-style params) and the standalone `nvmeof-cli` (flag-style params). This post uses the mgr module syntax, which is appropriate when running commands via the Ceph toolbox pod.
- The pod label `app=rook-ceph-nvmeof` used in the kubectl get command may vary depending on the Rook version; users should verify with their deployment.
