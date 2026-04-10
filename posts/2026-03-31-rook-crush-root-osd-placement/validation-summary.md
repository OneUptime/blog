# Validation Summary: How to Configure CRUSH Root for OSDs in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CRUSH algorithm, OSD management, pool creation)
- Kubernetes (kubectl, CephCluster CRD)
- CRUSH map hierarchy (roots, buckets, device classes)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph CRUSH map operations documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph CLI man page (osd crush commands): https://docs.ceph.com/en/reef/man/8/ceph/
- Ceph CRUSH device classes blog post: https://ceph.io/en/news/blog/2017/new-luminous-crush-device-classes/
- Rook ceph-volume provisioning design doc: https://github.com/rook/rook/blob/master/design/ceph/ceph-volume-provisioning.md
- Ceph CLI CRUSH management: https://ceph.io/en/news/blog/2014/ceph-managing-crush-with-the-cli/

## Issues Found

1. **Incorrect claim about how Rook applies crushRoot (line 48)**
   - **Was:** "Rook passes the root name to `ceph-volume` when provisioning the OSD."
   - **Changed to:** "Rook passes the root name via `--crush-location` when starting the OSD daemon."
   - **Why:** Rook does not pass `crushRoot` to `ceph-volume`. The `ceph-volume` tool handles LVM preparation and activation, not CRUSH placement. Instead, Rook sets the `ROOK_CRUSHMAP_ROOT` environment variable and applies the crush location via the `--crush-location` flag at OSD daemon startup time.

2. **Wrong command for moving an individual OSD in the CRUSH hierarchy (line 91)**
   - **Was:** `ceph osd crush move osd.3 host=ssd-node-1 root=ssd-root`
   - **Changed to:** `ceph osd crush set osd.3 5.0 host=ssd-node-1 root=ssd-root`
   - **Why:** `ceph osd crush move` is designed for CRUSH buckets (hosts, racks, roots), not individual OSDs. The correct command for placing an individual OSD at a specific location in the CRUSH hierarchy is `ceph osd crush set`, which also requires specifying the OSD's CRUSH weight.

## Review Notes
- The `ceph osd pool create` command uses the legacy positional syntax. Modern Ceph versions with PG autoscaling often allow simpler invocations, but the syntax shown is still valid and functional.
- The CephCluster CRD YAML, CRUSH rule creation, pool creation, crush tree output, device class assignment, and pool verification commands are all correct.
- The weight value `5.0` in the corrected `ceph osd crush set` command is illustrative; in practice, users should substitute the actual CRUSH weight of their OSD (typically derived from disk size in TiB).
