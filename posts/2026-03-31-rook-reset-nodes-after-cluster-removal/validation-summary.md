# Validation Summary: How to Reset Nodes After Rook-Ceph Cluster Removal

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system — Bluestore OSDs, monitors, managers)
- Linux disk management utilities: `wipefs`, `sgdisk`, `dd`, `partprobe`
- LVM (Logical Volume Manager): `pvdisplay`, `vgdisplay`, `lvdisplay`, `pvremove`, `vgremove`, `lvremove`
- Linux kernel modules: `modprobe`
- Kubernetes (`kubectl`)

## Sources Consulted
- Rook official teardown documentation: https://rook.io/docs/rook/latest/Getting-Started/ceph-teardown/
- `wipefs(8)` man page — flags `-a` (erase all signatures) and default listing behavior
- `sgdisk(8)` man page — `--zap-all` flag for removing GPT/MBR data structures
- `dd(1)` man page — zeroing disk regions
- `modprobe(8)` man page — `-r` flag for module removal
- LVM2 man pages: `lvremove(8)`, `vgremove(8)`, `pvremove(8)`

## Issues Found
- **Incorrect order of Steps 3 and 4**: The original post ran `wipefs` to remove disk signatures (Step 3) before removing LVM volumes (Step 4). This is incorrect because LVM structures must be deactivated and removed before wiping disk-level signatures. Running `wipefs` first destroys the metadata that LVM tools need to locate and cleanly remove their volumes, potentially leaving stale device-mapper entries. **Fix:** Swapped Steps 3 and 4 so LVM removal comes first, followed by disk signature wiping with `wipefs`. Also updated the summary paragraph to reflect the corrected order.

## Review Notes
- All commands (`wipefs -a`, `sgdisk --zap-all`, `dd`, `partprobe`, `modprobe -r`, `pkill -9`, LVM commands) use correct flags and syntax.
- The `lsblk -f` example output is illustrative with placeholder values, which is appropriate for a guide.
- The post uses SSH-based iteration over nodes, which is a common pattern for bare-metal Rook clusters. Users with different access methods (e.g., Ansible, kubectl debug) would need to adapt accordingly.
- The Rook teardown docs also mention `blkdiscard` as an optional step for SSDs/NVMe to fully discard all data; the post omits this, which is acceptable since it is not strictly required.
