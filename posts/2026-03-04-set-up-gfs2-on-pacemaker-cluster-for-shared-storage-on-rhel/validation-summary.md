# Validation Summary: How to Set Up GFS2 on a Pacemaker Cluster for Shared Storage on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 8 and 9
- GFS2
- Pacemaker and Corosync
- DLM
- lvmlockd and clustered LVM
- pcs CLI

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring GFS2 file systems - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_gfs2_file_systems/index
- Red Hat Enterprise Linux 8 documentation: Configuring GFS2 file systems - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_gfs2_file_systems/index
- Red Hat Enterprise Linux 8 documentation: Administering GFS2 file systems - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_gfs2_file_systems/assembly_creating-mounting-gfs2-configuring-gfs2-file-systems
- Red Hat support policy: LVM in a RHEL High Availability cluster - https://access.redhat.com/articles/3071171
- Red Hat support policy: DLM general policies - https://access.redhat.com/articles/3068921
- Red Hat Enterprise Linux 7 documentation: gfs2_tool replacement functions - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/global_file_system_2/index

## Issues Found
- The post described the procedure as generic RHEL, but the documented `lvmlockd`/DLM/GFS2 Pacemaker workflow applies to RHEL 8 and RHEL 9 with the Resilient Storage repository. I scoped the description and prerequisites to RHEL 8 or RHEL 9.
- The prerequisite commands omitted enabling the Resilient Storage repository, which Red Hat documents as required for these packages. I added the repository enable command and noted the RHEL 8 repository name.
- The post omitted `pcs property set no-quorum-policy=freeze`, which Red Hat documents as required when GFS2 is in use. I added the command before creating the DLM resource.
- The clustered LVM note told readers to set `locking_type = 1` and `use_lvmlockd = 1`. Red Hat's RHEL 8 and 9 GFS2 procedure specifically instructs setting `use_lvmlockd = 1`; I removed the potentially confusing `locking_type` instruction from the tutorial step.
- The optional LVM section could imply that creating an `lvmlockd` resource is a complete shared-LVM configuration. I clarified that shared volume groups, lockspace startup, and `LVM-activate` resources are still required before mounting LVM-backed GFS2 file systems.
- The filesystem resource section assumed `lvmlockd` ordering even though the example mounts a raw shared partition. I changed the filesystem ordering to depend directly on DLM for the shown raw-device example.
- The post used `gfs2_tool df`, but `gfs2_tool` is not supported on modern RHEL releases. I replaced it with `mount | grep gfs2` and `df -h /mnt/shared`.

## Review Notes
The tutorial still uses a simple two-node example with `/dev/sdb1` and hard-coded clone limits. For production documentation, it would be useful to prefer stable storage identifiers such as LVM logical volume paths, multipath devices, or persistent by-id paths.
