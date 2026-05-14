# Validation Summary: How to Troubleshoot GlusterFS Split-Brain Scenarios on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- GlusterFS
- Gluster replicated volumes
- Gluster split-brain resolution
- Gluster quorum and arbiter volumes
- Linux extended attributes

## Sources Consulted
- Gluster Docs, Troubleshooting Split-Brains: https://docs.gluster.org/en/main/Troubleshooting/resolving-splitbrain/
- Gluster Docs, Tuning Volume Options: https://docs.gluster.org/en/latest/Administrator-Guide/Tuning-Volume-Options/
- Gluster Docs, Arbiter volumes and quorum options: https://docs.gluster.org/en/latest/Administrator-Guide/arbiter-volumes-and-quorum/
- Red Hat Gluster Storage Life Cycle: https://access.redhat.com/support/policy/updates/rhs
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf

## Issues Found
- The favorite-child-policy example comment said `mtime` always preferred a specific brick. Changed it to state that `mtime` prefers the copy with the latest modification time.
- The favorite-child-policy list omitted `ctime` and described `majority` too loosely. Added `ctime` and clarified that `majority` chooses a file with identical size and mtime on more than half of the replica bricks.
- The manual resolution section recommended removing `trusted.afr.*` attributes directly on brick files. Replaced that with Gluster's documented mount-point xattr workflow using `replica.split-brain-status`, `replica.split-brain-choice`, and `replica.split-brain-heal-finalize`.
- The server-side quorum section claimed a 51% server quorum prevents writes whenever less than 51% of the storage pool is available. Revised it to distinguish server-side quorum from client I/O quorum and to avoid overstating split-brain protection.
- The 3-way replication section claimed GlusterFS automatically determines the majority version and heals. Revised it to say client quorum allows writes only when a majority of bricks in the replica set is available.
- The arbiter volume example used the older `replica 3 arbiter 1` syntax. Changed it to the current recommended `replica 2 arbiter 1` syntax.

## Review Notes
Red Hat Gluster Storage reached end of life on December 31, 2024, so production RHEL users should confirm their support path. RHEL 9 package manifests still list GlusterFS packages, and the GlusterFS CLI syntax in the post matches current upstream Gluster documentation after the fixes above.
