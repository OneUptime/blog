# Validation Summary: How to Configure Dynamic Bucket Index Resharding in Ceph RGW

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph dynamic bucket index resharding
- radosgw-admin CLI
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation on dynamic resharding (https://docs.ceph.com/en/latest/radosgw/dynamicresharding/)
- Ceph RGW configuration reference for `rgw_dynamic_resharding`, `rgw_max_objs_per_shard`, `rgw_reshard_thread_interval`
- radosgw-admin man page (`reshard list`, `reshard status`, `bucket reshard`, `bucket stats`, `log list`)
- Rook documentation on Ceph configuration overrides via `rook-config-override` ConfigMap
- kubectl documentation for `rollout restart` with label selectors

## Issues Found
1. **Invalid command for checking resharding completion**: The post used `radosgw-admin log list --bucket mybucket` to check resharding completion. The `log list` subcommand is for listing RGW usage/operation log objects, not resharding status, and does not accept a `--bucket` parameter in this context. Replaced with `radosgw-admin reshard status --bucket mybucket`, which is the correct command for monitoring resharding progress and completion.

## Review Notes
- The `ceph config set client.rgw` target works as a prefix match in Ceph's config system. In cephadm-deployed clusters, the actual RGW daemon entity names are typically `client.rgw.<realm>.<zone>`. The blog's usage is acceptable for general guidance but readers with cephadm deployments may need to adjust the target.
- Rook documentation now recommends using `cephConfig` and `cephConfigFromSecret` in the CephCluster CRD as the preferred method over the `rook-config-override` ConfigMap. The ConfigMap approach shown in the post still works but is considered a legacy/advanced method.
- The claim that RGW "processes requests normally" during resharding is a simplification. In modern Ceph (Pacific+), dynamic resharding is online and mostly non-blocking, but brief pauses or slowdowns may occur during the final atomic swap phase.
