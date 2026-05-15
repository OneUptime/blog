# Validation Summary: How to Configure XFS Project Quotas for Per-Directory Limits on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS filesystem
- XFS project quotas
- `xfs_quota`
- `/etc/fstab`
- `/etc/projects`
- `/etc/projid`

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems, Chapter 22: Limiting storage space usage on XFS with quotas: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- `xfs_quota(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/xfs_quota.8.html
- `xfs(5)` Linux manual page: https://www.man7.org/linux/man-pages/man5/xfs.5.html
- `projects(5)` Linux manual page: https://man7.org/linux/man-pages/man5/projects.5.html

## Issues Found
- The post stated that project quotas and group quotas cannot be used simultaneously on the same filesystem. Red Hat's RHEL 9 documentation says group and project quotas are only mutually exclusive on older non-default XFS disk formats. Updated the key concept and note to match the RHEL 9 behavior.
- The post described project quotas as counting every file solely by directory location. XFS project quotas track usage by project ID assigned to a managed directory tree. Updated the explanation to clarify that files count after the project is initialized and project IDs are assigned.

## Review Notes
The `xfs_quota` commands, project mapping file formats, quota limit syntax, reporting commands, and grace period command match the Red Hat documentation and `xfs_quota(8)` manual. The `/etc/fstab` example uses `pquota`, which is a documented alias for project quota support; Red Hat's fstab examples also commonly show `prjquota`.
