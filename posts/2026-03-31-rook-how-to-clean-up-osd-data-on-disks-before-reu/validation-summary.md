# Validation Summary: How to Clean Up OSD Data on Disks Before Reuse in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph (distributed storage system, BlueStore OSDs)
- Kubernetes (Jobs, Deployments, kubectl)
- LVM (Logical Volume Manager - lvremove, vgremove, pvremove)
- Linux disk utilities (sgdisk, wipefs, dd, blkdiscard, partprobe, lsblk, blkid)

## Sources Consulted
- Rook documentation on cleaning up OSD disks: https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/
- Ceph documentation on OSD removal: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph CLI reference for `osd purge`: https://docs.ceph.com/en/latest/man/8/ceph/
- sgdisk man page (GPT fdisk) for `--zap-all` flag
- wipefs man page for `--all` flag
- LVM2 documentation for lvremove, vgremove, pvremove commands
- Kubernetes batch/v1 Job API specification

## Issues Found
No technical issues found.

## Review Notes
- The section title "Step 2 - Delete the OSD Pod and PVC" mentions PVC deletion but only shows a deployment delete command. For raw-disk-based OSDs (which this post covers), there is no PVC to delete, so the command is correct for the scenario, but readers with PVC-based OSDs should be aware they would also need to delete the associated PVC.
- The Kubernetes Job in Step 7 omits the `wipefs --all` command that appears in the manual Step 5. This is not an error since `sgdisk --zap-all` combined with `dd` zeroing is sufficient, but including `wipefs` would add an extra layer of safety.
- The `vgs --noheadings -o vg_name` output includes leading whitespace, which is handled correctly by bash word splitting in the for loop but could be made more robust with `awk '{print $1}'` or `tr -d ' '`.
- The Ceph image tag `v18` is a rolling tag pointing to the latest Reef release. For production use, pinning to a specific version (e.g., `v18.2.4`) would be more reproducible.
