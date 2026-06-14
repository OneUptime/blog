# Validation Summary: How to Deploy Ceph Cluster on Bare Metal

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Ceph Reef
- cephadm
- Ceph monitors, managers, and OSDs
- RBD block storage
- RGW object storage
- CephFS
- Podman containers
- Chrony time synchronization
- Prometheus, Grafana, Alertmanager, and node-exporter

## Sources Consulted
- Ceph documentation: Using cephadm to Deploy a New Ceph Cluster - https://docs.ceph.com/en/reef/cephadm/install/
- Ceph documentation: Host Management - https://docs.ceph.com/en/reef/cephadm/host-management/
- Ceph documentation: OSD Service - https://docs.ceph.com/en/reef/cephadm/services/osd/
- Ceph documentation: Pools - https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph documentation: Placement Groups - https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph documentation: Basic Block Device Commands - https://docs.ceph.com/en/reef/rbd/rados-rbd-cmds/
- Ceph documentation: RGW Service - https://docs.ceph.com/en/reef/cephadm/services/rgw/
- Ceph documentation: FS volumes and subvolumes - https://docs.ceph.com/en/reef/cephfs/fs-volumes/
- Ceph documentation: Mount CephFS using Kernel Driver - https://docs.ceph.com/en/reef/cephfs/mount-using-kernel-driver/
- Ceph documentation: Mount CephFS using FUSE - https://docs.ceph.com/en/reef/cephfs/mount-using-fuse/
- Ceph documentation: Monitoring Services - https://docs.ceph.com/en/reef/cephadm/services/monitoring/
- Ceph documentation: Cephadm Troubleshooting - https://docs.ceph.com/en/reef/cephadm/troubleshooting/
- Ceph documentation: Upgrading Ceph - https://docs.ceph.com/en/reef/cephadm/upgrade/

## Issues Found
- The minimum hardware section said Ceph requires odd numbers for quorum. Ceph monitor quorum is majority-based and odd monitor counts are recommended, but Ceph does not require an odd number of nodes. Updated the wording to describe why three nodes are useful for monitors and OSD replication.
- The production hardware section referred to NVMe for journals/WAL. Modern Ceph OSDs use BlueStore DB/WAL rather than FileStore-style journals. Updated the wording to BlueStore DB/WAL.
- The Ubuntu preparation commands attempted to enable `podman` as a systemd service. Podman is daemonless; Ceph requires Podman or Docker to be installed. Replaced this with a version check.
- The cephadm install section called the Reef download the "latest" script and described cephadm as official only for Reef and later. Updated the wording to identify the download as the Reef cephadm standalone executable and describe cephadm as the modern deployment tool used by this Reef guide.
- The host-add commands entered `cephadm shell` before running `ssh-copy-id`. The official host-add flow installs `/etc/ceph/ceph.pub` into root's authorized keys from the host, then runs `ceph orch host add`. Reordered the commands and clarified that the address supplied is the public network address.
- The PG guidance did not mention the PG autoscaler. Added a caveat that the manual formula is only a rough starting point when preselecting PG counts manually.
- The client RBD copy commands did not create `/etc/ceph` and omitted the remote root user needed to read files under `/etc/ceph`. Added `sudo mkdir -p /etc/ceph` and `root@ceph-node1`.
- The CephFS kernel mount used older/ambiguous syntax for a named file system and exposed the secret on the command line. Updated it to the documented v2 device string for `myfs` with a `secretfile`, and updated the FUSE example to use `--id admin --client_fs myfs`.
- The monitoring deployment omitted node-exporter, which is part of the cephadm-managed monitoring stack when deploying it manually. Added `ceph orch apply node-exporter`.
- The daemon log example used `ceph log last 100 osd.0`, which is not a daemon-log command. Changed it to `ceph log last 100` for the cluster log and `cephadm logs --name ... -- -n 100` for daemon logs.

## Review Notes
The guide remains tied to Ceph Reef (v18). Future refreshes should consider updating the release target and cephadm download URL to the latest supported Ceph release available at that time.
