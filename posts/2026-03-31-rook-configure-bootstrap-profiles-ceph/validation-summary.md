# Validation Summary: How to Configure Bootstrap Profiles in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (authentication, bootstrap profiles, monitor capabilities)
- Rook (Kubernetes Ceph operator, external cluster integration)
- ceph-volume (OSD provisioning tool)
- Kubernetes (Secrets for keyring storage)

## Sources Consulted
- Ceph official documentation: user-management.rst (bootstrap profile descriptions) — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph source code: MonCap.cc (bootstrap profile capability grants) — https://github.com/ceph/ceph/blob/main/src/mon/MonCap.cc
- Ceph source code: AuthMonitor.cc (`_generate_bootstrap_keys()` function) — https://github.com/ceph/ceph/blob/main/src/mon/AuthMonitor.cc
- Ceph PR #16633: mon: added bootstrap-rbd auth profile — https://github.com/ceph/ceph/pull/16633
- Ceph PR #30411: rbd-mirror: simplify peer bootstrapping — https://github.com/ceph/ceph/pull/30411

## Issues Found
- **Incorrect description for `bootstrap-rbd` profile**: The table described `bootstrap-rbd` as "Bootstrapping RBD mirror daemons," which is incorrect. The `bootstrap-rbd` profile is for bootstrapping general RBD client users (with `profile rbd` monitor caps). The separate `bootstrap-rbd-mirror` profile handles RBD mirror daemon bootstrapping. Fixed the description to "Bootstrapping RBD client users."

## Review Notes
- The "Default Keyring Locations for Bootstrap" section lists only four paths (osd, mds, mgr, rgw) but omits `/var/lib/ceph/bootstrap-rbd/ceph.keyring` and `/var/lib/ceph/bootstrap-rbd-mirror/ceph.keyring`. This is a minor omission rather than a technical error, as the section appears to list only the most commonly used paths.
- All CLI commands (`ceph auth get-or-create`, `ceph auth get`, `kubectl create secret`) use correct syntax and flags.
- The bootstrap workflow description (ceph-volume reading keyring, authenticating, creating permanent OSD keyring) is accurate.
- The security best practices (chmod 600, restricting access, key rotation) are sound recommendations.
