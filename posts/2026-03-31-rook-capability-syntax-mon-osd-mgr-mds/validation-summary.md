# Validation Summary: How to Understand Capability Syntax (mon, osd, mgr, mds) in Ceph

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (CephX authorization system)
- Rook (Ceph orchestrator for Kubernetes)
- CephFS (Ceph Filesystem)
- RBD (RADOS Block Device)

## Sources Consulted
- Ceph User Management documentation — https://docs.ceph.com/en/latest/rados/operations/user-management/
- CephFS Client Capabilities documentation — https://docs.ceph.com/en/latest/cephfs/client-auth/
- CephX Config Reference — https://docs.ceph.com/en/reef/rados/configuration/auth-config-ref/
- Ceph MGR Administrator's Guide — https://docs.ceph.com/en/latest/mgr/administrator/
- Ceph RBD Commands documentation — https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/

## Issues Found
No technical issues found.

## Review Notes
- **MGR `allow profile osd` context**: The `mgr 'allow profile osd'` cap listed in the Manager section is technically valid but is primarily used for OSD daemons authenticating to the manager, not for general client users. The blog's description ("OSD-related manager access") is accurate but readers should understand this is the cap an OSD daemon itself would carry, not something typically assigned to a client application.
- **Mon profile syntax ambiguity**: The official Ceph documentation shows `mon 'profile {name}'` as the canonical syntax form, while Ceph internally stores and displays it as `allow profile {name}`. Both forms work. The blog uses `allow profile {name}`, which matches what `ceph auth ls` outputs and is correct.
- **OSD `profile rbd` without `allow` prefix**: The blog correctly shows `profile rbd` without an `allow` keyword for OSD caps. This matches the documented grammar where OSD caps have two distinct forms: `allow {access-spec}` and `profile {name}`.
- All CLI commands (`ceph auth get-or-create`, `ceph auth get`), capability strings, comma-separated OSD rules, pool restrictions, namespace restrictions, tag-based access, and MDS path restrictions are accurate per official Ceph documentation.
