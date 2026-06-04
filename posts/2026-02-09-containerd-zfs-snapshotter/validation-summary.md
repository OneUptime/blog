# Validation Summary: How to Set Up containerd ZFS Snapshotter for Copy-on-Write Container Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- containerd
- containerd CRI plugin
- containerd ZFS snapshotter
- OpenZFS / ZFS
- Ubuntu package management

## Sources Consulted
- containerd ZFS snapshotter README: https://github.com/containerd/zfs/blob/main/README.md
- containerd ZFS snapshotter plugin source: https://github.com/containerd/zfs/blob/main/plugin/plugin.go
- containerd plugin documentation: https://github.com/containerd/containerd/blob/main/docs/PLUGINS.md
- containerd CRI configuration guide: https://containerd.io/docs/1.7/cri/config/
- OpenZFS zfsprops manual: https://openzfs.github.io/openzfs-docs/man/master/7/zfsprops.7.html
- Ubuntu zpool-create manual: https://manpages.ubuntu.com/manpages/noble/man8/zpool-create.8.html
- Ubuntu zfs-create manual: https://manpages.ubuntu.com/manpages/noble/man8/zfs-create.8.html
- Ubuntu zfs-set manual: https://manpages.ubuntu.com/manpages/noble/man8/zfs-set.8.html
- Local containerd CLI output: `containerd config default`

## Issues Found
- The ZFS snapshotter configuration used `pool_name`, which is not a valid option for the containerd ZFS snapshotter. The plugin source and local `containerd config default` show `root_path` as the supported field. Changed the snippet to use `root_path` and clarified that the path must be a ZFS filesystem mount point.
- The post claimed container startup is instant regardless of image size and that ZFS eliminates layer extraction overhead. The ZFS snapshotter avoids copying parent data for snapshots after layers are unpacked, but image pull and unpack still take time. Updated the wording to reflect this.
- The post described ZFS snapshots as instant backups. ZFS snapshots are point-in-time copies and are not complete backups unless replicated or otherwise copied. Updated the wording to avoid overstating the feature.
- The "Configure prefetch" comment used `primarycache` and `secondarycache`, which control ARC and L2ARC caching rather than prefetch. Updated the comment.
- The post recommended `sync=disabled` as a performance optimization without warning. OpenZFS documents this setting as dangerous because it ignores synchronous write guarantees. Changed it to an optional commented command with a risk warning.
- The final summary repeated the inaccurate claim that ZFS eliminates layer extraction overhead and enables instant container cloning. Updated it to describe copy-on-write writable snapshot creation from existing image layers.

## Review Notes
- The `version = 2` containerd config is still supported by containerd 2.x, though upstream containerd documentation recommends config version 3 for containerd 2.x.
- The example block device `/dev/nvme1n1` is environment-specific and must be replaced with the correct unused device on a real node.
