# Validation Summary: How to Set Up GlusterFS Distributed Storage on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- GlusterFS server and client
- GlusterFS trusted storage pools
- GlusterFS distributed, replicated, distributed-replicated, and dispersed volumes
- GlusterFS geo-replication
- GlusterFS native FUSE mounts and deprecated Gluster-NFS
- UFW firewall rules
- XFS

## Sources Consulted
- GlusterFS Install Guide: https://docs.gluster.org/en/main/Install-Guide/Install/
- GlusterFS Setting Up Volumes: https://docs.gluster.org/en/main/Administrator-Guide/Setting-Up-Volumes/
- GlusterFS Managing Volumes: https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- GlusterFS Setting Up Clients: https://docs.gluster.org/en/main/Administrator-Guide/Setting-Up-Clients/
- GlusterFS Geo-Replication: https://docs.gluster.org/en/main/Administrator-Guide/Geo-Replication/
- GlusterFS Performance Tuning: https://docs.gluster.org/en/main/Administrator-Guide/Performance-Tuning/
- GlusterFS Tuning Volume Options: https://docs.gluster.org/en/main/Administrator-Guide/Tuning-Volume-Options/
- GlusterFS Split-Brain Resolution: https://docs.gluster.org/en/main/Troubleshooting/resolving-splitbrain/
- GlusterFS Managing Snapshots: https://docs.gluster.org/en/main/Administrator-Guide/Managing-Snapshots/
- Ubuntu 24.04 release notes, GlusterFS packaging notes: https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890

## Issues Found
- The PPA instructions referred to `ppa:gluster/glusterfs-10` as the latest stable release. Updated the wording to say the PPA must support the target Ubuntu release and changed the example to a GlusterFS 11 PPA for supported releases.
- The firewall section omitted UDP for ports 24007 and 24008 and described brick ports as a fixed default range. Added UDP rules and clarified that GlusterFS 10+ assigns brick ports randomly within the configured base-port/max-port range.
- The NFS section presented built-in Gluster-NFS as a normal alternative. Updated it to identify Gluster-NFS as deprecated and recommend native GlusterFS mounts or NFS-Ganesha for new NFS deployments.
- The geo-replication setup used the older `gluster system:: execute gsec_create` helper. Updated it to the current `gluster-georep-sshkey generate` command from the GlusterFS geo-replication guide.
- The geo-replication tuning section incorrectly described `sync-jobs` as a sync interval and used an unsupported `use-changelog` option. Corrected `sync-jobs` to concurrency and replaced `use-changelog` with `use-meta-volume true` plus its shared-volume prerequisite.
- The performance section described `server.tcp-user-timeout` as enabling TCP cork. Corrected the description to TCP user timeout.
- The small-file tuning snippet used an unverified negative-entry option. Replaced it with documented nl-cache group usage and `nl-cache-positive-entry`.
- The heal-status commands mislabeled `info healed` as pending heal and used `info heal-failed`. Corrected the labels and command to use `info`, `info healed`, `info failed`, and `info split-brain` appropriately.
- Troubleshooting examples used `netstat`, which is not installed by default on modern Ubuntu installs, and showed removing a made-up PID path. Replaced `netstat` with `ss` and changed the PID step to inspect PID files before removal.
- The health-check script could produce an empty heal count when no entries were reported. Changed the awk expression to print `0` in that case.
- The snapshot restore example omitted that restore is offline. Added volume stop/start around `gluster snapshot restore`.

## Review Notes
The article is technically relevant and salvageable. Some operational topics, such as TLS certificate setup, geo-replication with non-root users, NFS-Ganesha deployment, and workload-specific performance benchmarking, could be expanded in future revisions, but the core tutorial commands and explanations are now aligned with current GlusterFS documentation.
