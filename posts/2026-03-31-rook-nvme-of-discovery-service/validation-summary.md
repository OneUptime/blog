# Validation Summary: How to Configure NVMe-oF Discovery Service in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NVMe-oF Gateway
- NVMe over Fabrics (NVMe-oF) with TCP transport
- NVMe-oF Discovery Service
- nvme-cli (Linux NVMe userspace tooling)
- Kubernetes Services
- udev / systemd autoconnect

## Sources Consulted
- NVM Express TCP Transport Specification (port 8009 as IANA-registered discovery port)
- nvme-cli man pages: nvme-discover(1), nvme-connect-all(1), nvme-list(1) — https://man.archlinux.org/man/extra/nvme-cli/
- Rook CephNVMeOFGateway CRD source code — https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook NVMe-oF documentation — https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/nvme-of/
- Rook NVMe-oF example YAML — https://github.com/rook/rook/blob/master/deploy/examples/nvmeof-test.yaml
- Ceph NVMe-oF CLI documentation (ceph-nvmeof project)
- nvme-cli udev autoconnect rules — https://github.com/linux-nvme/nvme-cli/tree/master/nvmf-autoconnect/udev-rules/
- Red Hat documentation on NVMe-oF persistent discovery configuration

## Issues Found

1. **CRD kind name had wrong casing**: `CephNVMeoFGateway` (lowercase "o") was changed to `CephNVMeOFGateway` (uppercase "OF") to match the actual Rook CRD definition.

2. **CRD spec structure was incorrect**: The blog used `spec.server.active` and `spec.discovery.port`, which are not valid fields. Corrected to `spec.instances` and `spec.ports.discoveryPort` respectively. Added required fields `image`, `pool`, and `group` that were missing from the example.

3. **Subsystem create command was wrong**: `ceph nvmeof subsystem create --nqn` was changed to `ceph nvmeof subsystem add --subsystem` to match the actual Ceph NVMe-oF CLI interface.

4. **`nvme connect-all` invocation was incorrect**: `nvme connect-all --config /etc/nvme/discovery.conf` was wrong because `--config` expects a JSON configuration file, not the text-based discovery.conf. Corrected to just `nvme connect-all`, which automatically reads `/etc/nvme/discovery.conf`. Also changed the discovery.conf format to single-line per entry, matching standard conventions.

5. **udev autoconnect rule was non-standard**: The original rule used `ACTION=="add"`, `SUBSYSTEM=="nvme-subsystem"`, and `ATTR{model}=="Linux*"` with a direct `RUN+="/sbin/nvme connect-all"`. This was replaced with the official nvme-cli pattern: `ACTION=="change"`, `SUBSYSTEM=="nvme"`, `ENV{NVME_AEN}=="0x70f002"`, delegating to systemd via `nvmf-connect@.service`. The direct udev RUN approach is discouraged due to udev timeout constraints.

6. **Minor terminology fix**: Changed "Currently connected subsystems" to "Currently connected devices" in the verification script, since `nvme list` shows devices/namespaces, not subsystems (`nvme list-subsys` would show subsystems).

## Review Notes
- The `nvme discover` command syntax and flags (`-t tcp`, `-a`, `-s`, `-o normal`) are all correct.
- Port 8009 is correctly identified as the IANA-registered default NVMe-oF TCP discovery port.
- The Kubernetes Service for discovery endpoint is a reasonable pattern, though the pod label selector `app: rook-ceph-nvmeof` should be verified against the actual Rook deployment labels.
- The persistent discovery configuration at `/etc/nvme/discovery.conf` is the standard path. Some deployments may also want to include `--host-traddr` to specify the initiator's source address.
- The udev rule as corrected uses the official AEN-based pattern from nvme-cli. Deployments should ensure the `nvmf-connect@.service` systemd template is installed (ships with nvme-cli packages).
