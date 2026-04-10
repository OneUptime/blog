# Validation Summary: How to Set Up Ceph RBD for OpenNebula VMs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes-based Ceph orchestrator)
- Ceph RBD (RADOS Block Device)
- OpenNebula 6.x (cloud management platform)
- KVM/QEMU hypervisor
- libvirt (for Ceph secret management)
- Kubernetes (kubectl CLI)

## Sources Consulted
- Rook-Ceph documentation on cluster configuration storage (ConfigMap `rook-ceph-config` vs Secrets)
- OpenNebula 6.x Ceph Datastore documentation (datastore attributes: `CEPH_SECRET`, `CEPH_USER`, `CEPH_HOST`, `POOL_NAME`)
- OpenNebula CLI reference for `onevm` subcommands (disk-snapshot-create, disk-snapshot-revert, disk-snapshot-delete)
- Ceph documentation for `ceph auth get-or-create`, `rbd pool init`, and `ceph osd pool create`

## Issues Found

1. **Step 2 — Wrong Kubernetes resource type for ceph.conf extraction**: The command used `kubectl get secret rook-ceph-config` with `| base64 -d`. In Rook-Ceph, `rook-ceph-config` is a **ConfigMap**, not a Secret. ConfigMap data accessed via jsonpath is plain text, so `base64 -d` is unnecessary and would corrupt the output. Fixed to `kubectl get configmap rook-ceph-config` without the base64 decode pipe.

2. **Step 3 — Invalid OpenNebula datastore attribute `CEPH_KEY`**: The datastore configuration used `CEPH_KEY = "/etc/ceph/ceph.client.oneadmin.keyring"`. OpenNebula does not have a `CEPH_KEY` attribute. The correct attribute is `CEPH_SECRET`, which expects a **libvirt secret UUID** (not a keyring file path). The Ceph key is provided to QEMU/KVM via a libvirt secret that must be pre-configured on each hypervisor node using `virsh secret-define` and `virsh secret-set-value`. Fixed to `CEPH_SECRET = "<libvirt-secret-uuid>"`.

3. **Step 7 — Non-existent CLI subcommand `onevm disk-snapshot-list`**: OpenNebula does not have a `disk-snapshot-list` subcommand. The available disk snapshot subcommands are `disk-snapshot-create`, `disk-snapshot-delete`, `disk-snapshot-revert`, and `disk-snapshot-rename`. Disk snapshots are viewed as part of the `onevm show` output. Fixed to `onevm show 5`.

4. **Summary — Incorrect terminology "transport manager"**: OpenNebula's TM_MAD is officially called the "Transfer Manager", not "transport manager". Fixed to "transfer manager".

## Review Notes
- The blog post does not cover the libvirt secret setup required on each hypervisor node for Ceph authentication (using `virsh secret-define` and `virsh secret-set-value`). This is a prerequisite for the `CEPH_SECRET` attribute to work. A future update could add a brief step covering this setup.
- The `ceph osd pool create one 128 128` command explicitly sets 128 PGs. In modern Ceph (Nautilus+), PG autoscaling is enabled by default, so explicit PG counts are optional. The command is not wrong but could be simplified to `ceph osd pool create one` for newer Ceph versions.
- Step 1 creates the keyring inside the Rook toolbox pod, but Step 2 assumes the keyring file is available on the local host for SCP. The workflow for extracting the keyring from the pod (e.g., via `kubectl cp` or `ceph auth get-key`) is not shown. This is a workflow gap rather than a technical error in the commands themselves.
