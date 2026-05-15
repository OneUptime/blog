# Validation Summary: How to Plan and Deploy a GFS2 Cluster File System on RHEL

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Red Hat Enterprise Linux
- GFS2
- RHEL Resilient Storage Add-On
- Pacemaker and Corosync
- pcs
- DLM
- lvmlockd
- Shared LVM
- STONITH/fencing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring GFS2 file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_gfs2_file_systems/index
- Red Hat Enterprise Linux 10 documentation, "Considerations in adopting RHEL 10 - File systems and storage": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/considerations_in_adopting_rhel_10/file-systems-and-storage
- Red Hat Enterprise Linux 10 documentation, "10.1 Release Notes - Removed features": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/10.1_release_notes/removed-features

## Issues Found
- The post described GFS2 as included with RHEL without version scope. Red Hat documents that GFS2 and the Resilient Storage Add-On continue for RHEL 7, 8, and 9, but support has been removed in RHEL 10. Updated the opening description to scope the statement to RHEL 7, 8, and 9.
- The prerequisite command implied that `dnf install -y @ha` enables the HA repository. That installs a package group rather than enabling the required Resilient Storage repository. Replaced it with a `subscription-manager repos --enable=...resilientstorage...` example and noted the `use_lvmlockd = 1` LVM configuration requirement.
- The DLM resource used `systemd:dlm` and cloned it directly. Red Hat documents creating DLM as `ocf:pacemaker:controld` in a cloned `locking` resource group. Updated the cluster resource commands accordingly.
- The post omitted the required `no-quorum-policy=freeze` setting for GFS2 clusters. Added the documented `pcs property set no-quorum-policy=freeze` command.
- The shared LVM setup used `vgchange --lock-start`, but Red Hat documents `vgchange --lockstart`. Corrected the option and added the `lvmdevices --adddev` step for nodes using LVM devices files.
- The logical volume creation omitted shared activation. Updated the command to use `lvcreate --activate sy`, matching Red Hat's documented shared-LVM flow.
- The Pacemaker filesystem resource was cloned directly without an `LVM-activate` resource. Added the documented `ocf:heartbeat:LVM-activate` resource, grouped it with the GFS2 filesystem resource, cloned the group, and added ordering and colocation constraints with the locking group.
- The verification step used `gfs2_tool df`, which is not part of Red Hat's current documented RHEL 9 verification flow. Removed it and used `pcs status --full`.

## Review Notes
The corrected procedure follows the RHEL 9 GFS2 documentation. The post remains version-sensitive because GFS2 is not supported in RHEL 10 and later.
