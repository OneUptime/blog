# Validation Summary: How to Expand a GlusterFS Cluster by Adding New Bricks on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- GlusterFS
- Red Hat Gluster Storage
- XFS
- Linux storage administration

## Sources Consulted
- GlusterFS documentation, "Managing GlusterFS Volumes": https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- GlusterFS documentation, "Setting up GlusterFS Volumes": https://docs.gluster.org/en/main/Administrator-Guide/Setting-Up-Volumes/
- GlusterFS documentation, "Quick Start Guide": https://docs.gluster.org/en/main/Quick-Start-Guide/Quickstart/
- Red Hat Gluster Storage 3.5 Administration Guide, "Expanding Volumes": https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3.5/html/administration_guide/expanding_volumes
- Red Hat Gluster Storage 3.5 Administration Guide, "Brick Configuration": https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3.5/html/administration_guide/brick_configuration
- Red Hat Gluster Storage Life Cycle: https://access.redhat.com/support/policy/updates/rhs

## Issues Found
- Added a RHEL 9 support caveat. Red Hat Gluster Storage reached end of life on December 31, 2024, so the post should not imply that GlusterFS on RHEL 9 is a current Red Hat-supported storage product.
- Corrected the rebalance explanation. Gluster documentation states that directory layouts are static, so even newly created files in existing directories can continue to use the old brick layout until `fix-layout` or a full rebalance runs. The post now distinguishes layout updates from migrating existing data.

## Review Notes
The `gluster peer probe`, `gluster volume add-brick`, `gluster volume rebalance <volname> start`, `fix-layout`, `start force`, `stop`, `status`, and `volume heal <volname> info summary` commands match documented GlusterFS or Red Hat Gluster Storage workflows. The XFS inode-size example is consistent with GlusterFS and Red Hat guidance for brick filesystems.
