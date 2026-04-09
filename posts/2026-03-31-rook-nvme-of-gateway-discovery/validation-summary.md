# Validation Summary: How to Configure NVMe-oF Gateway Discovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph NVMe-oF gateway (ceph-nvmeof)
- NVMe over Fabrics (NVMe-oF) with TCP transport
- NVMe-oF Discovery Service (port 8009)
- nvme-cli (Linux NVMe userspace tooling)
- Kubernetes (CRDs, kubectl)

## Sources Consulted
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook NVMe-oF Block Storage docs: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Rook CRD definitions: https://github.com/rook/rook/blob/master/deploy/examples/crds.yaml
- Rook NVMe-oF example: https://github.com/rook/rook/blob/master/deploy/examples/nvmeof-test.yaml
- ceph-nvmeof GitHub repo (CLI source, pyproject.toml, tests): https://github.com/ceph/ceph-nvmeof
- nvme-discover(1) man page: https://manpages.debian.org/testing/nvme-cli/nvme-discover.1.en.html
- nvme-connect-all(1) man page: https://manpages.debian.org/testing/nvme-cli/nvme-connect-all.1.en.html
- nvmf-autoconnect systemd service: https://github.com/linux-nvme/nvme-cli/blob/master/nvmf-autoconnect/systemd/nvmf-autoconnect.service.in
- NVM Express TCP Transport Specification (2021, ratified)
- IANA Service Name and Transport Protocol Port Number Registry (ports 4420, 8009)
- Ceph NVMe/TCP Initiator for Linux: https://docs.ceph.com/en/latest/rbd/nvmeof-initiator-linux/

## Issues Found

### 1. Wrong CRD kind name
- **What was wrong:** `kind: CephNVMEofGateway` (incorrect capitalization)
- **Changed to:** `kind: CephNVMeOFGateway`
- **Why:** The Rook CRD registers the kind as `CephNVMeOFGateway`. The incorrect casing would be rejected by the Kubernetes API server.

### 2. Incorrect CRD spec structure
- **What was wrong:** The spec used fabricated nested fields `spec.server.image`, `spec.server.instances`, and an entire `spec.service` block with `type: LoadBalancer` and a `ports` list. None of these nested structures exist in the CRD.
- **Changed to:** Correct top-level fields: `spec.image`, `spec.pool`, `spec.group`, `spec.instances`. Removed the non-existent `service` block (the Rook operator manages Kubernetes Services automatically).
- **Why:** The actual CephNVMeOFGateway CRD has `image`, `pool`, `group`, and `instances` as direct children of `spec`. The `pool` and `group` fields are required. Port configuration uses `spec.ports.ioPort`, `spec.ports.discoveryPort`, etc., not a Service-style ports list.

### 3. Image tag `latest` changed to pinned version
- **What was wrong:** `quay.io/ceph/nvmeof:latest`
- **Changed to:** `quay.io/ceph/nvmeof:1.5`
- **Why:** The official Rook documentation pins to version `1.5`. Using `latest` is unreliable and may not exist as a named tag in the registry.

### 4. Wrong CLI tool name
- **What was wrong:** `nvmeof subsystem list` and `nvmeof subsystem add-host` — there is no `nvmeof` binary.
- **Changed to:** `ceph-nvmeof subsystem list` and `ceph-nvmeof host add`
- **Why:** The Ceph NVMe-oF gateway CLI is called `ceph-nvmeof` (installed via the Python package) or `cephnvmf` (shell alias inside gateway pods). No binary named `nvmeof` exists.

### 5. Wrong subcommand for adding hosts
- **What was wrong:** `nvmeof subsystem add-host --subsystem ... --host-nqn ...`
- **Changed to:** `ceph-nvmeof host add --subsystem ... --host-nqn ...`
- **Why:** The host management commands are under the `host` top-level command, not as a subcommand of `subsystem`. The correct command is `host add`, not `subsystem add-host`.

### 6. Wrong kubectl target for gateway CLI commands
- **What was wrong:** `kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ...`
- **Changed to:** `kubectl exec -it deploy/rook-ceph-nvmeof-nvmeof-gateway -n rook-ceph -- ...`
- **Why:** The `rook-ceph-tools` pod does not contain the `ceph-nvmeof` CLI. Gateway management commands must be run inside the NVMe-oF gateway pod itself.

### 7. Misleading discovery.conf format
- **What was wrong:** `-t tcp -a 192.168.1.50 -s 8009 -q hostnqn` — the literal string `hostnqn` could be confused for an actual value rather than a placeholder, and the short-flag format is less clear.
- **Changed to:** `--transport=tcp --traddr=192.168.1.50 --trsvcid=8009` (long-form, without `-q`)
- **Why:** Long-form flags match the style used in official Red Hat and Ceph documentation. Omitting `-q` lets the host NQN be read automatically from `/etc/nvme/hostnqn`, which is the standard behavior.

## Review Notes
- The `nvme discover` and `nvme connect-all` client-side commands (Steps 3-4) were correct with proper flags (`-t`, `-a`, `-s`).
- The discovery log output format is realistic and matches real nvme-cli output. Modern nvme-cli versions may also include a `sectype: none` field at the end of each entry.
- Port 4420 (NVMe-oF I/O) and port 8009 (NVMe-oF Discovery) are both IANA-assigned standard ports and are used correctly throughout.
- The `nvmf-autoconnect` systemd service is real and ships with nvme-cli.
- The Rook operator also exposes a gateway management gRPC port (default 5500) used by the CSI driver; this is distinct from the I/O and discovery ports and is not covered in this post (nor does it need to be).
