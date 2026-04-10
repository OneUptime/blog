# Validation Summary: How to Use Ceph RBD with Proxmox VE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (external Ceph cluster on Kubernetes)
- Ceph RBD (RADOS Block Device)
- Proxmox VE 7.x / 8.x
- Kubernetes (kubectl)
- Proxmox storage management (pvesm, qm)

## Sources Consulted
- Rook source code - `pkg/operator/ceph/config/store.go` (confirms `rook-ceph-config` is a Secret containing only `mon_host` and `mon_initial_members`, not `ceph.conf`)
- Rook Disaster Recovery docs: https://www.rook.io/docs/rook/latest-release/Troubleshooting/disaster-recovery/
- Rook Toolbox YAML: https://github.com/rook/rook/blob/master/deploy/examples/toolbox.yaml
- Proxmox VE Storage: RBD wiki: https://pve.proxmox.com/wiki/Storage:_RBD
- Proxmox pvesm(1) manual: https://pve.proxmox.com/pve-docs/pvesm.1.html
- Proxmox RBD storage docs: https://pve.proxmox.com/pve-docs/pve-storage-rbd-plain.html
- Ceph Messenger v2 docs: https://docs.ceph.com/en/reef/rados/configuration/msgr2/

## Issues Found
1. **Incorrect ceph.conf extraction command (Step 2)**: The original command `kubectl -n rook-ceph get secret rook-ceph-config -o jsonpath='{.data.ceph\.conf}' | base64 -d > /etc/ceph/ceph.conf` was wrong because the `rook-ceph-config` Secret does not contain a `ceph.conf` key. It only contains `mon_host` and `mon_initial_members`. Fixed to use `kubectl -n rook-ceph exec deploy/rook-ceph-tools -- cat /etc/ceph/ceph.conf > /etc/ceph/ceph.conf`, which extracts the generated ceph.conf directly from the toolbox pod where Rook constructs it from the mon endpoints.

## Review Notes
- The monitor port 6789 (msgr1/legacy) is used throughout. Modern Ceph deployments also listen on port 3300 (msgr2) which supports encryption. Port 6789 is not wrong but is the older protocol.
- The `ceph osd pool create proxmox 64 64` command specifies both pg_num and pgp_num explicitly. In Nautilus+ pgp_num auto-adjusts, so the second argument is redundant but not incorrect.
- The `qm move_disk` command uses the underscore form which works on both PVE 7.x and 8.x (8.x also supports `qm disk move` as the newer form).
- All Proxmox pvesm and qm commands verified as correct against official documentation.
- The claim that VM snapshots "map directly to RBD snapshots" is correct for the disk component, though Proxmox VM snapshots can also include RAM state and VM config which are stored separately.
