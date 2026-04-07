# Validation Summary: How to Understand New Features in Each Ceph Release

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (RADOS, RBD, CephFS, RGW)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph RBD CLI documentation: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph release naming conventions: https://docs.ceph.com/en/latest/releases/
- Ceph GitHub repository structure: https://github.com/ceph/ceph/tree/main/doc/releases

## Issues Found
1. **`rbd feature list` is not a valid command** (line 47): The `rbd` CLI has no `feature list` subcommand. Changed to `rbd info mypool/myimage`, which displays the features enabled on an image.

2. **`radosgw-admin feature list` is not a valid command** (line 70): The `radosgw-admin` CLI has no `feature list` subcommand. Changed to `radosgw-admin zone get`, which shows zone configuration including enabled features.

3. **`spec.features` does not exist in the CephCluster CRD** (lines 77-91): The CephCluster custom resource does not have a `spec.features` map with keys like `pg_autoscaler`. The pg_autoscaler is a Ceph mgr module enabled via `spec.mgr.modules`. Rewrote the YAML example and the corresponding kubectl command to use the correct `spec.mgr.modules` path.

4. **Changelog URL uses numeric path instead of release code name** (line 102): The expression `${NEW_VER%%.*}` evaluates to `19`, but Ceph release docs use code names (e.g., `squid.rst`, `reef.rst`), not version numbers. Changed to use `squid.rst` directly since the script already hardcodes version 19.2.0.

5. **"Tentacle" is not a confirmed Ceph release name** (line 13): While Ceph names follow alphabetical order and "T" is next after Squid, "Tentacle" has not been officially announced. Changed to "and so on" to avoid stating an unconfirmed name.

## Review Notes
- The script in "Tracking the Changelog Programmatically" is fragile since it hardcodes a release code name. A more robust approach would map version numbers to code names, but this is adequate for a blog post example.
- The `ceph features` command (line 39) shows client/daemon feature bit flags, not a human-friendly list of "new features." The surrounding text could be clearer about what this output represents, but it is technically valid.
