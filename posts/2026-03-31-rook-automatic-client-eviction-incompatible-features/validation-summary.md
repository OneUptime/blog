# Validation Summary: How to Set Up Automatic Client Eviction for Incompatible Features in CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- MDS (Metadata Server) configuration
- CephFS required client features
- kubectl CLI

## Sources Consulted
- Ceph source code: `src/mds/cephfs_features.cc` and `src/mds/cephfs_features.h` on GitHub (https://github.com/ceph/ceph) — authoritative list of valid CephFS client feature names
- Ceph source code: `src/common/options/mds.yaml.in` — authoritative list of MDS daemon config options
- Ceph source code: `src/mds/MDSDaemon.cc` — registered MDS admin socket commands
- CephFS Administration documentation (https://docs.ceph.com/en/latest/cephfs/administration/) — `ceph fs set`, `required_client_features`, `min_compat_client`
- CephFS Eviction documentation (https://docs.ceph.com/en/latest/cephfs/eviction/) — `client evict` command syntax
- Ceph man page for `ceph` CLI (https://docs.ceph.com/en/reef/man/8/ceph/)

## Issues Found

1. **Invalid CephFS client feature name `lazy_caps`**: The post used `ceph fs required_client_features cephfs add lazy_caps`. The correct feature name is `lazy_caps_wanted` (feature ID 11, corresponding to `CEPHFS_FEATURE_LAZY_CAP_WANTED`). `lazy_caps` would be rejected by the CLI. Fixed to `lazy_caps_wanted`.

2. **Non-existent config option `mds_session_timeout` used with `ceph config set mds`**: The post used `ceph config set mds mds_session_timeout 60`. This is not a valid MDS daemon config option. The session timeout is a per-filesystem MDSMap variable set via `ceph fs set cephfs session_timeout 60`. Fixed the command accordingly.

3. **Non-existent config option `mds_evict_clients_without_required_features`**: The post used `ceph config set mds mds_evict_clients_without_required_features true`. This config option does not exist in Ceph. Adding required features via `ceph fs required_client_features` automatically triggers eviction of incompatible clients — no separate boolean toggle is needed. Removed this command and updated the section text to explain the automatic behavior.

4. **Non-existent MDS admin command `evict_incompatible_clients`**: The post used `ceph tell mds.cephfs:0 evict_incompatible_clients`. This command does not exist in the MDS admin socket. The valid eviction commands are `client evict` (with filters like `id=`) and `session evict`. Removed the invalid command and the surrounding "evict all incompatible clients" paragraph, keeping only the valid `client evict id=<session_id>` command.

5. **Wrong CephFS parameter name `require_min_compat_client`**: The post used `ceph fs set cephfs require_min_compat_client nautilus`. The correct CephFS filesystem-level parameter is `min_compat_client`. (`require_min_compat_client` is a separate OSD-level cluster-wide setting accessed via `ceph osd set-require-min-compat-client`.) Fixed to `min_compat_client`.

6. **Inconsistent text description mentioning `client_eviction_policy`**: The introductory text for the "Enable Automatic Eviction" section referenced `session_timeout` and `client_eviction_policy`, but `client_eviction_policy` is not a Ceph config option and didn't match anything in the commands. Rewrote the text to accurately describe the `session_timeout` setting and the automatic eviction behavior.

7. **Summary paragraph referenced non-existent `mds_evict_clients_without_required_features`**: Updated the summary to reference only the real mechanisms: `required_client_features` and `min_compat_client`.

## Review Notes
- The `client evict id=<session_id>` command syntax and `ceph tell mds.cephfs:0 session ls` command are correct.
- The `reply_encoding` feature name (feature ID 9) is valid.
- The `ceph fs required_client_features` command syntax is correct.
- The monitoring command using `kubectl logs` with MDS label selectors is appropriate for a Rook deployment.
- Using `nautilus` as the example value for `min_compat_client` is valid, though in modern clusters a newer minimum (e.g., `pacific` or `quincy`) would be more typical.
