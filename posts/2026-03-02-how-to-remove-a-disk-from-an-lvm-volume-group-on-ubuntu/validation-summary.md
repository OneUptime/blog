# Validation Summary: How to Remove a Disk from an LVM Volume Group on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- LVM2 (Logical Volume Manager) on Linux
- Ubuntu
- `pvs`, `vgs`, `pvdisplay`, `lvdisplay`, `lvs` (LVM reporting tools)
- `pvcreate`, `vgextend`, `pvmove`, `vgreduce`, `pvremove` (LVM management tools)
- `wipefs`, `dd` (disk wiping utilities)

## Sources Consulted
- LVM2 official man pages: pvmove(8), pvdisplay(8), pvremove(8), vgreduce(8), vgextend(8), pvcreate(8), lvs(8), lvdisplay(8)
- Red Hat LVM Administration Guide (LVM concepts and pvmove semantics): https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/
- Ubuntu Server documentation on LVM: https://ubuntu.com/server/docs
- util-linux documentation for `wipefs`: https://man7.org/linux/man-pages/man8/wipefs.8.html
- GNU coreutils documentation for `dd` (`status=progress` flag, available since coreutils 8.24)

## Issues Found
- **`pvdisplay` example output in Step 3**: The original example showed `Allocatable           yes (but full)` while also showing `Free PE 127999` and `Allocated PE 0`. The "(but full)" suffix only appears when a PV has no free extents, which contradicts the rest of the output (the PV is empty after `pvmove`). Corrected to `Allocatable           yes` to match the empty-PV state being demonstrated.

## Review Notes
- All LVM commands and flags (`pvmove -b`, `pvmove -n <lv>`, `pvmove <src>:<pe-range> <dst>:<pe-range>`, resuming an interrupted `pvmove` by running it with no arguments) are correct per the pvmove(8) man page.
- The `copy_percent` column in `lvs -a -o name,copy_percent,devices` is the correct way to monitor `pvmove` progress because `pvmove` internally creates a temporary mirror.
- The math (`127999` PEs × 4 MiB ≈ 500 GiB) accurately reflects the small metadata overhead that consumes one PE on a typical PV.
- `dd ... status=progress` requires GNU coreutils 8.24+, which is satisfied by all currently supported Ubuntu releases.
- The post uses "GB" colloquially in prose while `pvdisplay` output correctly shows "GiB" — this mixing is common in real-world LVM tutorials and not incorrect.
- Running `watch -n 5 'sudo pvs'` may prompt for the sudo password repeatedly if the sudo timestamp expires, but functionally works; this is a minor UX consideration, not a technical error.
