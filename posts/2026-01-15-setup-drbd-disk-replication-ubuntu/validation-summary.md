# Validation Summary: How to Set Up DRBD for Disk Replication on Ubuntu

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Ubuntu
- DRBD 9
- DRBD utilities (`drbdadm`, `drbdsetup`)
- DRBD configuration files
- Pacemaker
- Corosync
- `pcs`
- STONITH/fencing
- Linux block devices and filesystems
- UFW
- fio

## Sources Consulted
- LINBIT DRBD 9 User Guide: https://linbit.com/drbd-user-guide/drbd-guide-9_0-en/
- Ubuntu Server DRBD documentation: https://ubuntu.com/server/docs/how-to/high-availability/install-drbd/
- Ubuntu `drbd.conf` 9.0.5 man page: https://manpages.ubuntu.com/manpages/noble/man5/drbd.conf-9.0.5.html
- Ubuntu `drbdsetup` 9.0.8 man page: https://manpages.ubuntu.com/manpages/noble/man8/drbdsetup-9.0.8.html
- Red Hat high availability documentation for promotable resources and constraints: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_creating-multinode-resources-configuring-and-managing-high-availability-clusters
- ClusterLabs Pacemaker 2.1 changes for promoted/unpromoted role names: https://projects.clusterlabs.org/w/projects/pacemaker/pacemaker_2.1_changes/

## Issues Found
- The Ubuntu DRBD 9 package install example used `drbd-dkms` without first enabling the LINBIT DRBD 9 PPA. Added the PPA setup command and `software-properties-common` installation so the package source is explicit.
- The Pacemaker resource-level fencing handler example used DRBD 8-style handler script names and omitted `fencing resource-only`. Updated the handlers to `crm-fence-peer.9.sh` / `crm-unfence-peer.9.sh` and added the required fencing option.
- The manual split-brain recovery example passed `--discard-my-data` in the wrong position for `drbdadm`. Changed it to `drbdadm -- --discard-my-data connect data`.
- Several resync tuning snippets mixed `resync-rate` with an enabled dynamic resync controller. Updated examples to use `c-max-rate` when `c-plan-ahead` is enabled and clarified that fixed `resync-rate` only applies when `c-plan-ahead` is `0`.
- The Pacemaker examples used deprecated `Master` and `Slave` role names. Updated monitor operations, colocation constraints, and expected-output comments to use `Promoted` and `Unpromoted`.

## Review Notes
The remaining commands and configuration examples are broadly consistent with current DRBD 9 and Pacemaker behavior. Some operational choices, such as exact timeout values, network buffer sizes, and fencing device parameters, remain environment-specific and should be tested in a staging cluster before production use.
