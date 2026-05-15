# Validation Summary: How to Replace a Failed Brick in a GlusterFS Volume on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- GlusterFS
- Gluster volume management
- Gluster self-heal
- XFS
- Linux extended attributes

## Sources Consulted
- Gluster Docs, Managing Volumes: https://docs.gluster.org/en/main/Administrator-Guide/Managing-Volumes/
- Red Hat Gluster Storage 3.3 Administration Guide, Migrating Volumes: https://docs.redhat.com/en/documentation/red_hat_gluster_storage/3.3/html/administration_guide/sect-migrating_volumes
- Gluster Docs, Troubleshooting Split-Brains: https://docs.gluster.org/en/main/Troubleshooting/resolving-splitbrain/
- Gluster Docs, Troubleshooting Self-heal: https://docs.gluster.org/en/main/Troubleshooting/troubleshooting-afr/
- Red Hat Gluster Storage Life Cycle: https://access.redhat.com/support/policy/updates/rhs

## Issues Found
- Clarified the opening availability claim. A replicated or dispersed volume can continue serving data only while enough healthy bricks remain to satisfy the volume's redundancy requirements.
- Added the missing requirement that the replacement brick directory must be empty before replacement. Gluster's replacement procedure explicitly requires an empty new brick.
- Added the dispersed-volume requirement that all other bricks must be online before replacing a failed brick.
- Corrected the same-node replacement procedure. The post used `replace-brick` with identical old and new brick paths and manually removed Gluster xattrs. Red Hat's documented procedure for reusing the same hostname and path is `gluster volume reset-brick ... start` followed by `gluster volume reset-brick ... commit force`, so the command block was updated accordingly.

## Review Notes
The commands for `replace-brick ... commit force`, `gluster volume heal VOLNAME`, `gluster volume heal VOLNAME full`, `gluster volume heal VOLNAME info`, and `cluster.shd-max-threads` are consistent with the consulted documentation. Red Hat Gluster Storage has reached the end of its Red Hat product lifecycle, so future updates to this post should clarify the support status for any specific RHEL deployment target.
