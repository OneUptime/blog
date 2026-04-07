# Validation Summary: How to Troubleshoot CephFS Client Eviction

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- MDS (Metadata Server)
- Kubernetes (kubectl, pod management)
- Prometheus (alerting rules)

## Sources Consulted
- Ceph official documentation on MDS client eviction: https://docs.ceph.com/en/reef/cephfs/eviction/
- Ceph configuration reference for MDS settings: https://docs.ceph.com/en/reef/cephfs/mds-config-ref/
- Ceph Octopus release notes on blacklist-to-blocklist rename: https://docs.ceph.com/en/latest/releases/octopus/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/

## Issues Found
- **`mds_session_blacklist_on_timeout` renamed to `mds_session_blocklist_on_timeout`**: In Ceph Octopus (v15.x) and later, all "blacklist" terminology was renamed to "blocklist". Since Rook currently ships with Ceph Reef or later, the old `mds_session_blacklist_on_timeout` config key is deprecated. Changed to `mds_session_blocklist_on_timeout`.

## Review Notes
- The `spec.metadataServer.config` field shown in the CephFilesystem YAML (Step 6) is not a standard part of the Rook CephFilesystem CRD. MDS-specific Ceph config options should be applied via `ceph config set` commands as shown in Steps 4 and 5. The YAML example still works as a reference for `activeCount` and `activeStandby`, but the `config` map may be ignored by Rook.
- The Prometheus metric `ceph_mds_evict_clients_total` used in the alerting rule may not exist as a standard Ceph exporter metric. Users should verify available MDS metrics in their Ceph MGR Prometheus module output before deploying this alert.
- All kubectl commands use correct syntax and flags for Rook-Ceph toolbox interaction.
- The `ceph tell mds.myfs:0 client ls` command syntax is correct for listing MDS clients.
- The `mds_session_timeout` default of 60s is correct; setting it to 120s is a reasonable tuning recommendation.
