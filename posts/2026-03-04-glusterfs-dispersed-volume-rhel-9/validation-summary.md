# Validation Summary: How to Configure a GlusterFS Dispersed Volume on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- GlusterFS
- GlusterFS dispersed volumes
- Erasure coding
- XFS
- Linux storage administration

## Sources Consulted
- GlusterFS documentation: Setting Up Volumes, including dispersed and distributed-dispersed volume syntax and redundancy rules: https://docs.gluster.org/en/main/Administrator-Guide/Setting-Up-Volumes/
- GlusterFS documentation: Tuning Volume Options, including `disperse.eager-lock`, `performance.io-thread-count`, `performance.cache-size`, and `performance.write-behind-window-size`: https://docs.gluster.org/en/main/Administrator-Guide/Tuning-Volume-Options/
- GlusterFS documentation: Managing Volumes, including heal commands: https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- GlusterFS 3.13 release notes, documenting `gluster volume heal <volname> info summary`: https://docs.gluster.org/en/main/release-notes/3.13.0/
- Red Hat Gluster Storage documentation: Brick Configuration, including XFS inode size guidance and using a directory inside the mount point as the brick directory: https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3.5/html/administration_guide/brick_configuration
- Red Hat Gluster Storage Life Cycle, noting Red Hat Gluster Storage reached end of life on December 31, 2024: https://access.redhat.com/support/policy/updates/rhs

## Issues Found
- The brick preparation commands formatted and mounted `/dev/sdb` even though the prerequisite refers to dedicated storage partitions. Updated the example to use `/dev/sdb1`, matching the common GlusterFS partitioning pattern and the fstab entry.
- The common configuration table listed `disperse 6 redundancy 3`. GlusterFS requires the total number of bricks to be greater than `2 * redundancy`, so 6 bricks with redundancy 3 is invalid. Changed it to `disperse 7 redundancy 3`, with 57% usable capacity and 3 failures tolerated.
- The performance tuning example described `disperse.eager-lock` as increasing the stripe unit and used `enable`. GlusterFS documents this option as an eager lock behavior setting with `on/off` values. Updated the comment and changed the value to `on`.
- The prerequisites did not clarify package sourcing for RHEL. Red Hat Gluster Storage is EOL, so the post now says GlusterFS should be installed from an appropriate package source for the reader's environment.

## Review Notes
- The GlusterFS volume creation, start, info, mount, distributed-dispersed, and heal command syntax matched the official documentation.
- Red Hat Gluster Storage reached end of life on December 31, 2024. The procedure remains technically valid for GlusterFS itself, but production RHEL deployments should verify supportability and package provenance before use.
