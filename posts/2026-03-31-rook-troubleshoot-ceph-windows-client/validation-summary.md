# Validation Summary: How to Troubleshoot Ceph Windows Client Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (Windows client)
- RBD (RADOS Block Device)
- CephFS with Dokan (Windows FUSE driver)
- Rook (Kubernetes Ceph operator)
- PowerShell
- Dokany (dokanctl)
- winsat (Windows System Assessment Tool)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/cephfs/ceph-dokan/
- Ceph Windows porting project (Cloudbase): https://github.com/cloudbase/ceph
- Ceph RBD man page: https://docs.ceph.com/en/quincy/man/8/rbd/
- Ceph configuration reference: https://docs.ceph.com/en/reef/rados/configuration/ceph-conf/
- Ceph user management: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph messenger v2 (msgr2) docs: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Dokany source (dokanctl flags): https://github.com/dokan-dev/dokany/blob/master/dokan_control/dokanctl.c
- Microsoft winsat disk documentation: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc742157(v=ws.11)

## Issues Found

1. **`dokanctl /r` incorrectly described as reinstall** (line 97): The `dokanctl /r` command removes the driver; it does not reinstall it. Additionally, it requires a component argument (`d` for driver, `n` for network provider). Fixed by changing to `dokanctl /r d` followed by `dokanctl /i d` to perform a proper remove-then-install sequence.

2. **`ceph config dump` misleading in context** (line 52): `ceph config dump` dumps the MON central configuration database, not the locally parsed `ceph.conf` file. The blog comment said "Dump parsed config to verify it loads correctly," which is misleading. Changed to `ceph-conf --show-config` which actually dumps the effective local configuration.

3. **`ceph-dokan --debug` is not a documented flag** (line 103): The `--debug` flag is not listed in the official ceph-dokan documentation. Changed to `--debug-client 10` which uses the standard Ceph debug subsystem mechanism.

4. **`Get-Disk` does not have a `DriveLetter` property** (line 129): The PowerShell `Get-Disk` cmdlet returns physical disk objects which do not have a `DriveLetter` property. Changed to `Get-Volume` with `FileSystemLabel` filter, which correctly exposes `DriveLetter` for mounted volumes.

## Review Notes
- The post uses port 6789 for MON connectivity testing, which is correct for msgr1. Modern Ceph clusters (Nautilus+) also listen on port 3300 for msgr2. A mention of both ports would make the guide more complete for newer deployments, but this is not an error.
- The post does not mention the WNBD driver dependency required for `rbd map` to work on Windows. This is an important prerequisite that readers would need, but adding it would constitute new content beyond the scope of error correction.
- `rbd map` is used as shorthand; the canonical form is `rbd device map`, but `rbd map` is a recognized alias.
