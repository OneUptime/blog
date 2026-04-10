# Validation Summary: How to Use Capability Profiles (profile osd, mds, rbd, crash) in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (authentication and capability system)
- Rook (Ceph operator for Kubernetes)
- Ceph capability profiles (profile osd, mds, rbd, rbd-read-only, rbd-mirror, crash, bootstrap-osd, bootstrap-mds)
- kubectl / Kubernetes CLI
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation on user management and auth capabilities (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph source code for capability profile definitions (src/mon/MonCap.cc, src/osd/OSDCap.cc)
- Rook documentation on Ceph cluster configuration (https://rook.io/docs/rook/latest/)
- Ceph auth subsystem documentation (https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/)

## Issues Found

### Issue 1: Incomplete list of subsystems supporting profiles
- **Location:** Introduction section, line 15
- **What was wrong:** The text stated profiles are used in the `mon` and `osd` subsystem caps, but the post itself demonstrates profiles used in `mgr` caps (e.g., `mgr 'allow profile osd'` for OSDs and `mgr 'allow profile crash'` for the crash collector).
- **Fix applied:** Changed to "`mon`, `osd`, and `mgr` subsystem caps" to accurately reflect the profile usage shown in the post's own examples.

### Issue 2: Incorrect kubectl exec flags for piped output
- **Location:** Profiles in Rook CephCluster section, line 122
- **What was wrong:** The command used `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools --` with the `-it` flags. The `-t` flag allocates a pseudo-TTY which injects carriage return characters into the output stream, potentially corrupting the JSON that gets piped to `jq`. Neither `-i` (stdin passthrough) nor `-t` (TTY allocation) is needed for a non-interactive command whose output is being piped.
- **Fix applied:** Removed `-it` flags from the kubectl exec command.

## Review Notes
- The post uses both `allow profile X` (OSD, crash sections) and `profile X` (RBD section) syntax for mon caps. Both forms are valid in Ceph, so this is not technically wrong, but the inconsistency could confuse readers who notice the difference. No change was made since both are accepted syntax.
- All profile names referenced in the post (`profile osd`, `profile mds`, `profile rbd`, `profile rbd-read-only`, `profile rbd-mirror`, `profile crash`, `profile bootstrap-osd`, `profile bootstrap-mds`) are real, documented Ceph capability profiles.
- The explanation that Ceph stores the profile string rather than expanded permissions, with server-side evaluation at permission-check time, is accurate and a useful clarification.
- The MDS capability example using `osd 'allow rwx'` is the standard recommendation from Ceph documentation, though some deployments may need additional OSD permissions depending on CephFS feature usage.
