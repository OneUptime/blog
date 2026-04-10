# Validation Summary: How to Configure Monitor Settings in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (monitor daemon configuration)
- Rook (Kubernetes Ceph operator)
- Kubernetes (CRDs, kubectl)

## Sources Consulted
- Ceph source code option definitions (`src/common/options/mon.yaml.in`, `src/common/options/global.yaml.in`)
- Ceph source code monitor commands (`src/mon/MonCommands.h`)
- Ceph official documentation for monitor configuration (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Ceph official documentation for debug logging (https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/)
- Rook documentation for CephCluster CRD (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)

## Issues Found

1. **`mon_max_pgmap_epochs` does not exist** — This config option is not a real Ceph setting. It does not appear in any Ceph option definition files. Replaced with `mon_max_log_epochs` (default 500), which is a valid monitor epoch retention setting, and updated the inline comments to accurately describe each option.

2. **`debug_mon` reset incorrectly set to 0** — The post used `ceph config set mon debug_mon 0` with the comment "Reset to defaults after debugging." The actual default for `debug_mon` is `1/5` (log level 1, memory level 5), not 0. Setting to 0 would suppress important messages. Additionally, the post set `debug_ms 1` for debugging but never reset it. Fixed by replacing with `ceph config rm mon debug_mon` and `ceph config rm mon debug_ms`, which properly removes the overrides and reverts to built-in defaults.

3. **`mon_subscribe_interval` incorrectly described** — The comment said "Timeout for receiving commands" but `mon_subscribe_interval` actually controls the refresh interval for client subscriptions to cluster maps. Fixed the comment to "Subscription refresh interval for client map updates (seconds)."

4. **`ceph tell mon.* mon_metadata` is not a valid command** — `mon_metadata` is not registered as a tell/admin-socket command in Ceph's MonCommands.h. It is a regular monitor command invoked as `ceph mon metadata`. The comment also incorrectly said "Monitor store stats" when mon_metadata returns metadata (hostname, version, etc.), not store statistics. Fixed to `ceph mon metadata` with an accurate comment.

5. **Ambiguous summary about pool deletion protection** — The summary stated "pool deletion protection (disable by default)" which most naturally reads as "the protection is disabled by default." This is incorrect — `mon_allow_pool_delete` defaults to `false`, meaning pool deletion protection is *enabled* by default. Fixed to "pool deletion protection (enabled by default)."

## Review Notes
- The command `ceph quorum_status | python3 -m json.tool | grep skew` in the Clock Drift Settings section is unlikely to return useful results, as `quorum_status` output does not typically contain skew data. The preceding command `ceph health detail | grep clock` is the correct way to check for clock skew. The `quorum_status` command is not wrong per se, but readers should know it may not surface skew information.
- `mon_subscribe_interval` is noted in Ceph docs as primarily relevant for pre-Jewel clients. Modern Ceph deployments may not need to adjust this setting.
- All other config option names, defaults, CLI commands, Rook CRD YAML, and technical explanations were verified as accurate.
